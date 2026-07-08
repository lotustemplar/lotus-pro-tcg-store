import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { z } from "zod";

const productIdsSchema = z.array(z.string().min(1)).min(1);

const bulkSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("delete"),
    productIds: productIdsSchema,
  }),
  z.object({
    action: z.literal("setActive"),
    productIds: productIdsSchema,
    value: z.boolean(),
  }),
  z.object({
    action: z.literal("setFeatured"),
    productIds: productIdsSchema,
    value: z.boolean(),
  }),
  z.object({
    action: z.literal("setCategory"),
    productIds: productIdsSchema,
    categoryId: z.string().min(1),
  }),
  z.object({
    action: z.literal("setAutoUpdatePrice"),
    productIds: productIdsSchema,
    value: z.boolean(),
  }),
]);

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let count = 0;

  switch (parsed.data.action) {
    case "delete": {
      const result = await prisma.product.deleteMany({
        where: { id: { in: parsed.data.productIds } },
      });
      count = result.count;
      break;
    }
    case "setActive": {
      const result = await prisma.product.updateMany({
        where: { id: { in: parsed.data.productIds } },
        data: { isActive: parsed.data.value },
      });
      count = result.count;
      break;
    }
    case "setFeatured": {
      const result = await prisma.product.updateMany({
        where: { id: { in: parsed.data.productIds } },
        data: { featuredOnHome: parsed.data.value },
      });
      count = result.count;
      break;
    }
    case "setCategory": {
      const result = await prisma.product.updateMany({
        where: { id: { in: parsed.data.productIds } },
        data: { categoryId: parsed.data.categoryId },
      });
      count = result.count;
      break;
    }
    case "setAutoUpdatePrice": {
      const result = await prisma.product.updateMany({
        where: { id: { in: parsed.data.productIds } },
        data: { autoUpdatePrice: parsed.data.value },
      });
      count = result.count;
      break;
    }
  }

  return NextResponse.json({ ok: true, count });
}
