import type { Metadata } from "next";
import { ProductCard } from "@/components/ProductCard";
import { toCardProps, searchProducts } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SearchPage({ searchParams }: { searchParams: { q?: string } }) {
  const q = (searchParams.q ?? "").trim();
  const products = await searchProducts(q);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">
        Search results for &quot;{q}&quot;
      </h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} {...toCardProps(p)} />
        ))}
      </div>
      {products.length === 0 && <p className="text-gray-400">No products matched your search.</p>}
    </div>
  );
}
