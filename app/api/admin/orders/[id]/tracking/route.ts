import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { sendMail } from "@/lib/mailer";
import { buildShipmentEmail } from "@/lib/order-shipment-email";
import { buildTrackingUrl, normalizeTrackingCarrier } from "@/lib/shipping-tracking";

const schema = z.object({
  trackingCarrier: z.string().trim().min(1).max(40),
  trackingNumber: z.string().trim().min(1).max(120),
  trackingUrl: z.string().trim().url().optional().or(z.literal("")),
  sendEmail: z.boolean().optional().default(false),
});

function getStoredCustomerName(shippingAddress: string | null) {
  if (!shippingAddress) return null;

  try {
    const parsed = JSON.parse(shippingAddress) as { name?: unknown } | null;
    const name = typeof parsed?.name === "string" ? parsed.name.trim() : "";
    return name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid shipment details." }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: {
        select: {
          nameSnapshot: true,
          quantity: true,
          priceCents: true,
          product: {
            select: {
              sourceSetName: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const trackingCarrier = normalizeTrackingCarrier(parsed.data.trackingCarrier);
  const trackingNumber = parsed.data.trackingNumber.trim();
  const trackingUrl =
    parsed.data.trackingUrl?.trim() || buildTrackingUrl(trackingCarrier, trackingNumber) || null;

  const updatedOrder = await prisma.order.update({
    where: { id: params.id },
    data: {
      trackingCarrier,
      trackingNumber,
      trackingUrl,
      shippedAt: new Date(),
      status: "fulfilled",
      trackingEmailError: null,
    },
    select: {
      id: true,
      email: true,
      shippingAddress: true,
      subtotalCents: true,
      shippingCents: true,
      totalCents: true,
      items: {
        select: {
          nameSnapshot: true,
          quantity: true,
          priceCents: true,
          product: {
            select: {
              sourceSetName: true,
            },
          },
        },
      },
    },
  });

  if (!parsed.data.sendEmail) {
    return NextResponse.json({
      ok: true,
      message: "Tracking saved. The order is now marked as fulfilled.",
    });
  }

  if (!updatedOrder.email || updatedOrder.email === "pending@checkout") {
    await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingEmailError: "A real customer email address is not available on this order yet.",
      },
    });

    return NextResponse.json(
      {
        error: "Tracking was saved, but this order does not have a real customer email address yet.",
      },
      { status: 400 },
    );
  }

  try {
    const siteSettings = await getSiteSettings();
    const email = buildShipmentEmail({
      siteSettings,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
      orderId: updatedOrder.id,
      customerName: getStoredCustomerName(updatedOrder.shippingAddress),
      trackingCarrier,
      trackingNumber,
      trackingUrl,
      items: updatedOrder.items.map((item) => ({
        nameSnapshot: item.nameSnapshot,
        setName: item.product.sourceSetName,
        quantity: item.quantity,
        lineTotalCents: item.priceCents * item.quantity,
      })),
      shippingCents: updatedOrder.shippingCents,
      totalCents: updatedOrder.totalCents,
    });

    await sendMail({
      to: updatedOrder.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingEmailSentAt: new Date(),
        trackingEmailError: null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Tracking saved and shipment email sent to the customer.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to send the shipment email.";

    await prisma.order.update({
      where: { id: params.id },
      data: {
        trackingEmailError: message,
      },
    });

    return NextResponse.json(
      {
        error: `Tracking was saved, but the shipment email could not be sent: ${message}`,
      },
      { status: 500 },
    );
  }
}
