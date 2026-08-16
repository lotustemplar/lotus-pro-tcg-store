import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getSiteSettings } from "@/lib/site-settings";
import { sendMail } from "@/lib/mailer";
import { buildOrderConfirmationEmail } from "@/lib/order-confirmation-email";
import { buildOrderSaleNotificationEmail } from "@/lib/order-sale-notification-email";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import Stripe from "stripe";

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
    const orderId = session.metadata?.orderId;
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
            ...existingOrder.items.map((item: OrderItemRow) =>
              prisma.product.update({
                where: { id: item.productId },
                data: { quantity: { decrement: item.quantity } },
              }),
            ),
          ]);
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
