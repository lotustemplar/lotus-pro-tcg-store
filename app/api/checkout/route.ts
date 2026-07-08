import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calculateShippingCents } from "@/lib/shipping";
import { z } from "zod";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
});

type CheckoutProduct = {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  isActive: boolean;
  images: { url: string }[];
};

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid cart" }, { status: 400 });
  }

  // Always re-derive prices/stock from the DB — never trust client-sent prices.
  const productIds = parsed.data.items.map((i) => i.productId);
  const products: CheckoutProduct[] = await prisma.product.findMany({
    where: { id: { in: productIds }, isActive: true },
    include: { images: { take: 1, orderBy: { sortOrder: "asc" } } },
  });

  const lineItems: { productId: string; name: string; priceCents: number; quantity: number; image: string | null }[] = [];

  for (const item of parsed.data.items) {
    const product = products.find((p: CheckoutProduct) => p.id === item.productId);
    if (!product) {
      return NextResponse.json({ error: `Product no longer available.` }, { status: 400 });
    }
    if (product.quantity < item.quantity) {
      return NextResponse.json(
        { error: `Only ${product.quantity} left of "${product.name}".` },
        { status: 400 }
      );
    }
    lineItems.push({
      productId: product.id,
      name: product.name,
      priceCents: product.priceCents,
      quantity: item.quantity,
      image: product.images[0]?.url ?? null,
    });
  }

  const subtotalCents = lineItems.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
  const shippingCents = calculateShippingCents(subtotalCents);

  const order = await prisma.order.create({
    data: {
      email: "pending@checkout",
      status: "pending",
      subtotalCents,
      shippingCents,
      totalCents: subtotalCents + shippingCents,
      items: {
        create: lineItems.map((i) => ({
          productId: i.productId,
          nameSnapshot: i.name,
          priceCents: i.priceCents,
          quantity: i.quantity,
        })),
      },
    },
  });

  const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        ...lineItems.map((i) => ({
          quantity: i.quantity,
          price_data: {
            currency: "usd",
            unit_amount: i.priceCents,
            product_data: {
              name: i.name,
              images: i.image ? [i.image] : undefined,
            },
          },
        })),
        ...(shippingCents > 0
          ? [
              {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: shippingCents,
                  product_data: { name: "Flat Rate Shipping" },
                },
              },
            ]
          : []),
      ],
      metadata: { orderId: order.id },
      success_url: `${origin}/success?order=${order.id}`,
      cancel_url: `${origin}/cancel?order=${order.id}`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error", err);
    return NextResponse.json(
      { error: "Stripe is not configured yet — add STRIPE_SECRET_KEY to .env" },
      { status: 500 }
    );
  }
}
