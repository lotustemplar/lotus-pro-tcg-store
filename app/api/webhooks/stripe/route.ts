import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { sendMail } from "@/lib/mailer";
import { buildOrderConfirmationEmail } from "@/lib/order-confirmation-email";
import { buildOrderSaleNotificationEmail } from "@/lib/order-sale-notification-email";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import Stripe from "stripe";
import { decodeCart } from "@/lib/sync/cart-metadata";
import { recordSale } from "@/lib/sync/engine";

type OrderItemRow = {
  productId: string;
  quantity: number;
  nameSnapshot: string;
  priceCents: number;
  product: {
    sourceSetName: string | null;
  };
};

function serializeShippingSnapshot(session: Stripe.Checkout.Session) {
  const shippingDetails = session.shipping_details;
  const customerDetails = session.customer_details;
  const address = shippingDetails?.address ?? customerDetails?.address ?? null;

  if (!address && !shippingDetails?.name && !customerDetails?.name && !customerDetails?.phone) {
    return null;
  }

  return JSON.stringify({
    source: shippingDetails?.address ? "stripe_shipping" : "stripe_customer",
    name: shippingDetails?.name ?? customerDetails?.name ?? null,
    phone: customerDetails?.phone ?? null,
    address: address
      ? {
          line1: address.line1 ?? null,
          line2: address.line2 ?? null,
          city: address.city ?? null,
          state: address.state ?? null,
          postal_code: address.postal_code ?? null,
          country: address.country ?? null,
        }
      : null,
  });
}

function getCustomerNameFromSession(session: Stripe.Checkout.Session) {
  return session.shipping_details?.name ?? session.customer_details?.name ?? null;
}

function getOrderNotificationEmail() {
  return (
    process.env.ORDER_NOTIFICATION_EMAIL?.trim() ||
    process.env.CONTACT_FORM_TO_EMAIL?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    ""
  );
}

function parseShippingSnapshot(raw: string | null) {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as {
      name?: string | null;
      phone?: string | null;
      address?: {
        line1?: string | null;
        line2?: string | null;
        city?: string | null;
        state?: string | null;
        postal_code?: string | null;
        country?: string | null;
      } | null;
    };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;
  try {
    if (!sig || !webhookSecret) throw new Error("Missing signature or webhook secret");
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
      return NextResponse.json({ received: true, skipped: "not paid" });
    }
    const orderId = await ensurePaidOrder(session);
    if (orderId) {
      const existingOrder = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: {
                select: {
                  sourceSetName: true,
                },
              },
            },
          },
        },
      });

      if (existingOrder) {
        const nextEmail = session.customer_details?.email ?? existingOrder.email;
        const nextShippingAddress = serializeShippingSnapshot(session) ?? existingOrder.shippingAddress;
        const nextPaymentIntent =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : existingOrder.stripePaymentIntent ?? undefined;

        let order = existingOrder;

        if (existingOrder.status === "pending") {
          await prisma.$transaction([
            prisma.order.update({
              where: { id: orderId },
              data: {
                status: "paid",
                email: nextEmail,
                shippingAddress: nextShippingAddress,
                stripePaymentIntent: nextPaymentIntent,
              },
            }),
          ]);
          for (const item of existingOrder.items) {
            await recordSale({ source: "store", externalOrderId: orderId, productId: item.productId, quantity: item.quantity });
          }
          revalidateCatalogCache();

          order = {
            ...existingOrder,
            status: "paid",
            email: nextEmail,
            shippingAddress: nextShippingAddress,
            stripePaymentIntent: nextPaymentIntent ?? existingOrder.stripePaymentIntent,
          };
        } else if (
          nextEmail !== existingOrder.email ||
          nextShippingAddress !== existingOrder.shippingAddress ||
          nextPaymentIntent !== existingOrder.stripePaymentIntent
        ) {
          order = await prisma.order.update({
            where: { id: orderId },
            data: {
              email: nextEmail,
              shippingAddress: nextShippingAddress,
              stripePaymentIntent: nextPaymentIntent,
            },
            include: {
              items: {
                include: {
                  product: {
                    select: {
                      sourceSetName: true,
                    },
                  },
                },
              },
            },
          });
        }

        const siteSettings = await getSiteSettings();
        const emailStatusUpdate: Record<string, Date | string | null> = {};
        const failures: string[] = [];
        const customerName = getCustomerNameFromSession(session) ?? parseShippingSnapshot(order.shippingAddress)?.name ?? null;

        if (!order.confirmationEmailSentAt) {
          if (nextEmail && nextEmail !== "pending@checkout") {
            try {
              const email = buildOrderConfirmationEmail({
                siteSettings,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                orderId,
                customerName,
                items: order.items.map((item: OrderItemRow) => ({
                  nameSnapshot: item.nameSnapshot,
                  setName: item.product.sourceSetName,
                  quantity: item.quantity,
                  lineTotalCents: item.priceCents * item.quantity,
                })),
                shippingCents: order.shippingCents,
                totalCents: order.totalCents,
              });

              await sendMail({
                to: nextEmail,
                subject: email.subject,
                html: email.html,
                text: email.text,
              });

              emailStatusUpdate.confirmationEmailSentAt = new Date();
              emailStatusUpdate.confirmationEmailError = null;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Customer confirmation email failed.";
              emailStatusUpdate.confirmationEmailError = message;
              failures.push(`customer confirmation: ${message}`);
            }
          } else {
            emailStatusUpdate.confirmationEmailError =
              "Stripe checkout completed without a deliverable customer email address.";
          }
        }

        const orderNotificationEmail = getOrderNotificationEmail();
        if (!order.saleNotificationSentAt) {
          if (orderNotificationEmail) {
            try {
              const email = buildOrderSaleNotificationEmail({
                siteSettings,
                siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                orderId,
                customerEmail: nextEmail,
                customerName,
                shipping: parseShippingSnapshot(order.shippingAddress),
                items: order.items.map((item: OrderItemRow) => ({
                  nameSnapshot: item.nameSnapshot,
                  setName: item.product.sourceSetName,
                  quantity: item.quantity,
                  lineTotalCents: item.priceCents * item.quantity,
                })),
                subtotalCents: order.subtotalCents,
                shippingCents: order.shippingCents,
                totalCents: order.totalCents,
              });

              await sendMail({
                to: orderNotificationEmail,
                subject: email.subject,
                html: email.html,
                text: email.text,
              });

              emailStatusUpdate.saleNotificationSentAt = new Date();
              emailStatusUpdate.saleNotificationError = null;
            } catch (error) {
              const message =
                error instanceof Error ? error.message : "Owner sale notification email failed.";
              emailStatusUpdate.saleNotificationError = message;
              failures.push(`owner sale notification: ${message}`);
            }
          } else {
            emailStatusUpdate.saleNotificationError =
              "No owner notification email is configured. Set ORDER_NOTIFICATION_EMAIL or CONTACT_FORM_TO_EMAIL.";
          }
        }

        if (Object.keys(emailStatusUpdate).length > 0) {
          await prisma.order.update({
            where: { id: orderId },
            data: emailStatusUpdate,
          });
        }

        if (failures.length > 0) {
          console.error("Order email delivery failed", {
            orderId,
            failures,
          });
          return NextResponse.json(
            {
              error: "One or more order emails failed to send and will be retried by Stripe.",
            },
            { status: 500 },
          );
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}


/**
 * Create the Order only now that Stripe says it is paid (idempotent on stripeSessionId),
 * decrement store stock and queue Mana Pool / TCGplayer decrements.
 * Legacy sessions that still carry metadata.orderId fall through to the old pending->paid path.
 */
async function ensurePaidOrder(session: Stripe.Checkout.Session): Promise<string | null> {
  const legacyId = session.metadata?.orderId;
  if (legacyId) return legacyId;
  const existing = await prisma.order.findUnique({ where: { stripeSessionId: session.id }, select: { id: true } });
  if (existing) return existing.id;
  const lines = decodeCart(session.metadata as Record<string, string>);
  if (lines.length === 0) return null;
  const products = await prisma.product.findMany({ where: { id: { in: lines.map((l) => l.productId) } }, select: { id: true, name: true } });
  const nameOf = new Map(products.map((p) => [p.id, p.name]));
  const subtotalCents = Number(session.metadata?.subtotalCents ?? lines.reduce((s, l) => s + l.priceCents * l.quantity, 0));
  const shippingCents = Number(session.metadata?.shippingCents ?? 0);
  let order;
  try {
    order = await prisma.order.create({
      data: {
        stripeSessionId: session.id,
        stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : null,
        email: session.customer_details?.email ?? "unknown@checkout",
        status: "paid",
        subtotalCents,
        shippingCents,
        totalCents: session.amount_total ?? subtotalCents + shippingCents,
        shippingAddress: serializeShippingSnapshot(session),
        items: { create: lines.map((l) => ({ productId: l.productId, nameSnapshot: nameOf.get(l.productId) ?? "Product", priceCents: l.priceCents, quantity: l.quantity })) },
      },
    });
  } catch (e) {
    // Concurrent webhook retry created it first.
    const again = await prisma.order.findUnique({ where: { stripeSessionId: session.id }, select: { id: true } });
    if (again) return again.id;
    throw e;
  }
  for (const l of lines) {
    await recordSale({ source: "store", externalOrderId: order.id, productId: l.productId, quantity: l.quantity });
  }
  revalidateCatalogCache();
  return order.id;
}
