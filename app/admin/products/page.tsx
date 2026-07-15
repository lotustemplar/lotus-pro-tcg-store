import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getAllCategoriesWithParent } from "@/lib/admin";
import { getDisplayProductName } from "@/lib/product-display";
import { ProductsManager } from "./ProductsManager";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const categories = await getAllCategoriesWithParent();
  const topLevels = categories
    .filter((category) => category.parentId === null)
    .map((category) => ({ id: category.id, name: category.name }));
  const parentIds = new Set(categories.map((category) => category.parentId).filter(Boolean));
  const leafCategories = categories
    .filter((category) => !parentIds.has(category.id))
    .map((category) => ({
      id: category.id,
      name: category.name,
      topLevelId: category.parent ? category.parent.id : category.id,
      topLevelName: category.parent ? category.parent.name : category.name,
    }));

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Products</h1>
        <Link href="/admin/products/new" className="text-sm text-brand-300 hover:underline">
          Open full product form
        </Link>
      </div>

      <ProductsManager
        topLevels={topLevels}
        leafCategories={leafCategories}
        initialProducts={products.map((product) => ({
          id: product.id,
          name: getDisplayProductName(product.name, product.sourceSetName),
          priceCents: product.priceCents,
          sourceMarketplace: product.sourceMarketplace,
          sourceSetName: product.sourceSetName,
          sourceProductType: product.sourceProductType,
          sourcePriceCents: product.sourcePriceCents,
          imageUrl: product.images[0]?.url ?? product.sourceImageUrl ?? null,
          autoUpdatePrice: product.autoUpdatePrice,
          lastSyncedAt: product.lastSyncedAt?.toISOString() ?? null,
          lastSyncError: product.lastSyncError,
          quantity: product.quantity,
          featuredOnHome: product.featuredOnHome,
          isActive: product.isActive,
          categoryId: product.categoryId,
        }))}
      />
    </div>
  );
}
