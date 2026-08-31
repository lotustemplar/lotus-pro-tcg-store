import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { getArchivedDeletedProductData } from "@/lib/product-delete";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import { submitFullSiteToIndexNow } from "@/lib/indexnow";
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
      const products = await prisma.product.findMany({
        where: { id: { in: parsed.data.productIds } },
        select: {
          id: true,
        },
      });
      const archivedIds = products.map((product) => product.id);

      try {
        if (archivedIds.length > 0) {
          await prisma.product.updateMany({
            where: { id: { in: archivedIds } },
            data: getArchivedDeletedProductData(),
          });
        }

        try {
          revalidateCatalogCache();
          await submitFullSiteToIndexNow();
        } catch (followUpError) {
          console.error("Bulk product delete follow-up failed", {
            productIds: parsed.data.productIds,
            message: followUpError instanceof Error ? followUpError.message : String(followUpError),
          });
        }

        return NextResponse.json({
          ok: true,
          count: archivedIds.length,
          deletedIds: [],
          archivedIds,
          message: `Removed ${archivedIds.length} product(s) from the active catalog.`,
        });
      } catch (error) {
        console.error("Bulk product delete failed", {
          productIds: parsed.data.productIds,
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
