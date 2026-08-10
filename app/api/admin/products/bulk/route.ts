import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getArchivedDeletedProductData } from "@/lib/product-delete";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import { submitFullSiteToIndexNow } from "@/lib/indexnow";
import { Prisma } from "@prisma/client";
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

function isOrderHistoryDeleteBlock(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2014")
  );
}

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
      const linkedOrderItems = await prisma.orderItem.findMany({
        where: { productId: { in: parsed.data.productIds } },
        select: { productId: true },
        distinct: ["productId"],
      });
      const linkedIdSet = new Set(linkedOrderItems.map((item) => item.productId));
      const deletableIds = parsed.data.productIds.filter((id) => !linkedIdSet.has(id));
      const archivedIds = parsed.data.productIds.filter((id) => linkedIdSet.has(id));

      try {
        const result = await prisma.$transaction(async (tx) => {
          const deleted =
            deletableIds.length > 0
              ? await tx.product.deleteMany({
                  where: { id: { in: deletableIds } },
                })
              : { count: 0 };

          if (archivedIds.length > 0) {
            await tx.product.updateMany({
              where: { id: { in: archivedIds } },
              data: getArchivedDeletedProductData(),
            });
          }

          return { deletedCount: deleted.count, archivedIds };
        });

        revalidateCatalogCache();
        await submitFullSiteToIndexNow();

        return NextResponse.json({
          ok: true,
          count: result.deletedCount,
          deletedIds: deletableIds,
          archivedIds: result.archivedIds,
          message:
            result.archivedIds.length > 0
              ? `Deleted ${result.deletedCount} product(s). Archived ${result.archivedIds.length} product(s) that are tied to past orders.`
              : undefined,
        });
      } catch (error) {
        if (isOrderHistoryDeleteBlock(error)) {
          return NextResponse.json(
            {
              error:
                "One or more selected products are tied to past orders and cannot be permanently deleted.",
            },
            { status: 409 },
          );
        }

        console.error("Bulk product delete failed", {
          productIds: parsed.data.productIds,
          code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
          message: error instanceof Error ? error.message : String(error),
        });

        return NextResponse.json({ error: "Failed to delete selected products." }, { status: 500 });
      }
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
        data: parsed.data.value
          ? { featuredOnHome: true }
          : { featuredOnHome: false, featuredOrder: 0 },
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

  revalidateCatalogCache();
  await submitFullSiteToIndexNow();

  return NextResponse.json({ ok: true, count });
}
