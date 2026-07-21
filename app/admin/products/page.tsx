import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getAllCategoriesWithParent } from "@/lib/admin";
import { getDisplayProductName } from "@/lib/product-display";
import { ProductsManager } from "./ProductsManager";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function normalizePage(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function buildPageHref(page: number) {
  return page <= 1 ? "/admin/products" : `/admin/products?page=${page}`;
}

function PaginationControls({
  page,
  totalPages,
}: {
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-panel px-4 py-3">
      <p className="text-sm text-gray-400">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={buildPageHref(page - 1)}
          aria-disabled={page <= 1}
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
            page <= 1
              ? "pointer-events-none border-white/10 text-gray-600"
              : "border-border text-gray-200 hover:border-brand-400/50 hover:text-white"
          }`}
        >
          Previous
        </Link>
        <Link
          href={buildPageHref(page + 1)}
          aria-disabled={page >= totalPages}
          className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
            page >= totalPages
              ? "pointer-events-none border-white/10 text-gray-600"
              : "border-border text-gray-200 hover:border-brand-400/50 hover:text-white"
          }`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
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

  const requestedPage = normalizePage(searchParams?.page);
  const totalProducts = await prisma.product.count();
  const totalPages = Math.max(1, Math.ceil(totalProducts / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    skip,
    take: PAGE_SIZE,
    include: {
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
      },
    },
  });

  const rangeStart = totalProducts === 0 ? 0 : skip + 1;
  const rangeEnd = totalProducts === 0 ? 0 : skip + products.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold text-white">Products</h1>
        <Link href="/admin/products/new" className="text-sm text-brand-300 hover:underline">
          Open full product form
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-bg-panel px-4 py-3">
        <p className="text-sm text-gray-300">
          Showing {rangeStart}-{rangeEnd} of {totalProducts} products.
        </p>
      </div>

      <PaginationControls page={currentPage} totalPages={totalPages} />

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

      <PaginationControls page={currentPage} totalPages={totalPages} />
    </div>
  );
}
