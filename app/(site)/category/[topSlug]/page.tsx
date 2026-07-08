import { notFound } from "next/navigation";
import Link from "next/link";
import { getTopCategory, getProductsForCategoryIds, toCardProps } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { topSlug: string };
}): Promise<Metadata> {
  const cat = await getTopCategory(params.topSlug);
  if (!cat) return {};
  return {
    title: cat.name,
    description: `Shop ${cat.name} sealed product, boxes, packs, and more at Lotus Pro Decks.`,
  };
}

export default async function TopCategoryPage({ params }: { params: { topSlug: string } }) {
  const cat = await getTopCategory(params.topSlug);
  if (!cat) return notFound();

  const categoryIds = cat.children.length > 0 ? cat.children.map((c) => c.id) : [cat.id];
  const products = await getProductsForCategoryIds(categoryIds);

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
              href={`/category/${cat.slug}/${sub.slug}`}
              className="rounded-full border border-border bg-bg-panel px-5 py-2 text-sm font-semibold text-gray-200 hover:border-brand-500 hover:text-brand-300"
            >
              {sub.name}
            </Link>
          ))}
        </div>
      )}

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
