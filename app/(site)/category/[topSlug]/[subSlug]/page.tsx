import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPageControls } from "@/components/CategoryPageControls";
import { ProductCard } from "@/components/ProductCard";
import {
  getProductsForCategoryIds,
  getSubCategory,
  toCardProps,
  type CategorySortOption,
} from "@/lib/products";
import { getSiteSettings } from "@/lib/site-settings";
import { buildSocialMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

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
  params: { topSlug: string; subSlug: string };
}): Promise<Metadata> {
  const [cat, settings] = await Promise.all([
    getSubCategory(params.topSlug, params.subSlug),
    getSiteSettings(),
  ]);
  if (!cat) return {};
  const title = cat.name;
  const description = `Shop ${cat.name} at ${settings.brandName}.`;

  return {
    title,
    description,
    ...buildSocialMetadata({
      title,
      description,
      path: `/category/${params.topSlug}/${params.subSlug}`,
      image: settings.categoryBackgrounds[params.topSlug] || null,
      siteName: settings.brandName,
    }),
  };
}

export default async function SubCategoryPage({
  params,
  searchParams,
}: {
  params: { topSlug: string; subSlug: string };
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const cat = await getSubCategory(params.topSlug, params.subSlug);
  if (!cat) return notFound();

  const sort = normalizeSort(searchParams?.sort);
  const hideOutOfStock = isHideOutOfStockEnabled(searchParams?.["hide-out-of-stock"]);
  const products = await getProductsForCategoryIds([cat.id], { sort, hideOutOfStock });

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{cat.name}</h1>
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
