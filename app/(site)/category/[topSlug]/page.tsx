import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CategoryPageControls } from "@/components/CategoryPageControls";
import { ProductCard } from "@/components/ProductCard";
import {
  getProductsForCategoryIds,
  getTopCategory,
  toCardProps,
  type CategorySortOption,
} from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";
import { buildSocialMetadata } from "@/lib/metadata";
import { STORE_CATALOG_REVALIDATE_SECONDS } from "@/lib/storefront-cache";

export const revalidate = STORE_CATALOG_REVALIDATE_SECONDS;

function normalizeSort(value: string | string[] | undefined): CategorySortOption {
  if (typeof value !== "string") return "newest";

  const allowed: CategorySortOption[] = ["newest", "price-asc", "price-desc", "name-asc", "name-desc"];
  return allowed.includes(value as CategorySortOption) ? (value as CategorySortOption) : "newest";
}

function isHideOutOfStockEnabled(value: string | string[] | undefined) {
  return value === "1" || value === "true";
}

export async function generateMetadata({
  params,
}: {
  params: { topSlug: string };
}): Promise<Metadata> {
  const [cat, settings] = await Promise.all([getTopCategory(params.topSlug), getSiteSettings()]);
  if (!cat) return {};
  const title = cat.name;
  const description = `Shop ${cat.name} sealed product, boxes, packs, and more at ${settings.brandName}.`;

  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      path: `/category/${cat.slug}`,
      image: settings.categoryBackgrounds[cat.slug] || null,
      siteName: settings.brandName,
    }),
  };
}

export default async function TopCategoryPage({
  params,
  searchParams,
}: {
  params: { topSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const cat = await getTopCategory(params.topSlug);
  if (!cat) return notFound();

  const sort = normalizeSort(searchParams?.sort);
  const hideOutOfStock = isHideOutOfStockEnabled(searchParams?.["hide-out-of-stock"]);
  const categoryIds = cat.children.length > 0 ? cat.children.map((c) => c.id) : [cat.id];
  const products = await getProductsForCategoryIds(categoryIds, { sort, hideOutOfStock });
  const query = new URLSearchParams();
  if (sort !== "newest") query.set("sort", sort);
  if (hideOutOfStock) query.set("hide-out-of-stock", "1");
  const querySuffix = query.toString() ? `?${query.toString()}` : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{cat.name}</h1>
      </div>

      {cat.children.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {cat.children.map((sub) => (
            <Link
              key={sub.id}
              href={`/category/${cat.slug}/${sub.slug}${querySuffix}`}
              className="rounded-full border border-border bg-bg-panel px-5 py-2 text-sm font-semibold text-gray-200 hover:border-brand-500 hover:text-brand-300"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

      <CategoryPageControls sort={sort} hideOutOfStock={hideOutOfStock} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} {...toCardProps(p)} />
        ))}
      </div>

      {products.length === 0 && (
        <p className="text-gray-400">No products in this category yet - check back soon.</p>
      )}
    </div>
  );
}
