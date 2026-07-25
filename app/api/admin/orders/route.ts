import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

const createOrderSchema = z.object({
  email: z.string().trim().email(),
  customerName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  addressLine1: z.string().trim().max(160).optional().or(z.literal("")),
  addressLine2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  state: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().max(40).optional().or(z.literal("")),
  country: z.string().trim().max(60).optional().or(z.literal("")),
  status: z.enum(["pending", "paid", "fulfilled", "cancelled"]).default("paid"),
  shippingCents: z.number().int().min(0),
  reduceInventory: z.boolean().default(true),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
        priceCents: z.number().int().min(0),
      }),
    )
    .min(1),
});

function optionalString(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createOrderSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid manual order." }, { status: 400 });
  }

  const effectiveReduceInventory = parsed.data.reduceInventory && parsed.data.status !== "cancelled";

  try {
    const createdOrder = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(parsed.data.items.map((item) => item.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          name: true,
          quantity: true,
        },
      });

      if (products.length !== productIds.length) {
        return null;
      }

      const productMap = new Map(products.map((product) => [product.id, product]));
      const subtotalCents = parsed.data.items.reduce(
        (sum, item) => sum + item.quantity * item.priceCents,
        0,
      );

      if (effectiveReduceInventory) {
        for (const item of parsed.data.items) {
          const result = await tx.product.updateMany({
            where: {
              id: item.productId,
              quantity: { gte: item.quantity },
            },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          if (result.count !== 1) {
            throw new Error(`Insufficient stock for one or more selected products.`);
          }
        }
      }

      const shippingSnapshot = {
        name: optionalString(parsed.data.customerName),
        phone: optionalString(parsed.data.phone),
        source: "manual_admin",
        address: {
          line1: optionalString(parsed.data.addressLine1),
          line2: optionalString(parsed.data.addressLine2),
          city: optionalString(parsed.data.city),
          state: optionalString(parsed.data.state),
          postal_code: optionalString(parsed.data.postalCode),
          country: optionalString(parsed.data.country),
        },
      };

      return tx.order.create({
        data: {
          email: parsed.data.email.trim(),
          status: parsed.data.status,
          subtotalCents,
          shippingCents: parsed.data.shippingCents,
          totalCents: subtotalCents + parsed.data.shippingCents,
          shippingAddress: JSON.stringify(shippingSnapshot),
          items: {
            create: parsed.data.items.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) {
                throw new Error("One or more selected products could not be found.");
              }

              return {
                productId: item.productId,
                nameSnapshot: product.name,
                priceCents: item.priceCents,
                quantity: item.quantity,
              };
            }),
          },
        },
        select: {
          id: true,
        },
      });
    });

    if (!createdOrder) {
      return NextResponse.json({ error: "One or more selected products could not be found." }, { status: 400 });
    }

    revalidateCatalogCache();

    return NextResponse.json({ ok: true, id: createdOrder.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create the manual order.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
