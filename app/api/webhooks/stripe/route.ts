import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import Stripe from "stripe";

type OrderItemRow = { productId: string; quantity: number };

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
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (order && order.status === "pending") {
        await prisma.$transaction([
          prisma.order.update({
            where: { id: orderId },
            data: {
              status: "paid",
              email: session.customer_details?.email ?? order.email,
              shippingAddress: serializeShippingSnapshot(session),
              stripePaymentIntent:
                typeof session.payment_intent === "string" ? session.payment_intent : undefined,
            },
          }),
          ...order.items.map((item: OrderItemRow) =>
            prisma.product.update({
              where: { id: item.productId },
              data: { quantity: { decrement: item.quantity } },
            })
          ),
        ]);
        revalidateCatalogCache();
      }
    }
  }

  return NextResponse.json({ received: true });
}
