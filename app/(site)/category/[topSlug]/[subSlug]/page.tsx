import { notFound } from "next/navigation";
import { getSubCategory, getProductsForCategoryIds, toCardProps } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { topSlug: string; subSlug: string };
}): Promise<Metadata> {
  const cat = await getSubCategory(params.topSlug, params.subSlug);
  if (!cat) return {};
  return {
    title: cat.name,
    description: `Shop ${cat.name} at Lotus Pro Decks.`,
  };
}

export default async function SubCategoryPage({
  params,
}: {
  params: { topSlug: string; subSlug: string };
}) {
  const cat = await getSubCategory(params.topSlug, params.subSlug);
  if (!cat) return notFound();

  const products = await getProductsForCategoryIds([cat.id]);

  return (
    <div className="space-y-8">
      <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{cat.name}</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} {...toCardProps(p)} />
        ))}
      </div>
      {products.length === 0 && (
        <p className="text-gray-400">No products in this category yet — check back soon.</p>
      )}
    </div>
  );
}
