import Link from "next/link";
import { formatCents } from "@/lib/format";

function StockPill({ quantity }: { quantity: number }) {
  if (quantity <= 0) {
    return (
      <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-gray-200">
        Sold Out
      </span>
    );
  }

  if (quantity === 1) {
    return (
      <span className="rounded-full bg-red-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
        Only 1 Left
      </span>
    );
  }

  if (quantity < 5) {
    return (
      <span className="rounded-full bg-amber-500/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-white">
        Low Stock
      </span>
    );
  }

  return (
    <span className="rounded-full border border-emerald-400/25 bg-emerald-500/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-300">
      In Stock
    </span>
  );
}

export function ProductCard({
  slug,
  name,
  priceCents,
  compareAtCents,
  image,
  quantity,
}: {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  image: string | null;
  quantity: number;
}) {
  return (
    <Link
      href={`/product/${slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,24,40,0.92),rgba(10,14,23,0.98))] transition duration-300 hover:-translate-y-1 hover:border-brand-400/60 hover:shadow-[0_24px_70px_rgba(6,10,20,0.52)]"
    >
      <div className="relative aspect-[0.92] w-full overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-bg-elevated text-gray-600">
            No Image
          </div>
        )}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,10,18,0.02),rgba(7,10,18,0.18)_55%,rgba(7,10,18,0.82))]" />
        <div className="absolute left-4 top-4">
          <StockPill quantity={quantity} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-4">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gray-500">
            Collector Favorite
          </p>
          <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug text-white">
            {name}
          </h3>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3">
          <div className="space-y-1">
            <div className="font-display text-2xl font-bold text-brand-300">
              {formatCents(priceCents)}
            </div>
            {compareAtCents && compareAtCents > priceCents ? (
              <div className="text-xs text-gray-500 line-through">{formatCents(compareAtCents)}</div>
            ) : (
              <div className="text-xs uppercase tracking-[0.22em] text-gray-500">View Product</div>
            )}
          </div>

          <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white transition group-hover:border-brand-400/60 group-hover:bg-brand-500/12">
            Shop
          </div>
        </div>
      </div>
    </Link>
  );
}
