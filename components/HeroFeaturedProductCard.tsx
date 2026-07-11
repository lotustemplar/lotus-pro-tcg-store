import Link from "next/link";
import { getDisplayProductName } from "@/lib/product-display";

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function HeroFeaturedProductCard({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    sourceSetName: string | null;
    priceCents: number;
    compareAtCents: number | null;
    quantity: number;
    images: { url: string }[];
  };
}) {
  const displayName = getDisplayProductName(product.name, product.sourceSetName);

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(9,13,22,0.82),rgba(9,13,22,0.94))] p-3 shadow-[0_20px_60px_rgba(2,6,16,0.46)] backdrop-blur-xl transition hover:border-brand-400/60 hover:bg-[linear-gradient(180deg,rgba(16,22,38,0.92),rgba(9,13,22,0.98))]"
    >
      <div className="flex h-[72px] items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] p-2">
        {product.images[0]?.url ? (
          <img
            src={product.images[0].url}
            alt={product.name}
            className="max-h-full w-auto object-contain transition duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="text-[10px] uppercase tracking-[0.14em] text-gray-500">No Image</div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500">
              {product.sourceSetName || "Featured Product"}
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium leading-5 text-white" title={product.name}>
              {displayName}
            </p>
          </div>
          {product.quantity <= 1 ? (
            <span className="rounded-full border border-red-400/30 bg-red-500/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-red-200">
              Low
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-white">{formatPrice(product.priceCents)}</p>
            {product.compareAtCents && product.compareAtCents > product.priceCents ? (
              <p className="text-xs text-gray-500 line-through">{formatPrice(product.compareAtCents)}</p>
            ) : null}
          </div>
          <span className="inline-flex rounded-full border border-brand-300/30 bg-brand-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-100 transition group-hover:border-white/30 group-hover:bg-brand-500/20">
            Shop
          </span>
        </div>
      </div>
    </Link>
  );
}
