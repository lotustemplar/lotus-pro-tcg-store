import Link from "next/link";
import Image from "next/image";
import { formatCents } from "@/lib/format";

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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-bg-panel transition hover:border-brand-500 hover:shadow-[0_0_24px_rgba(124,58,237,0.25)]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-bg-elevated">
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-gray-600">No Image</div>
        )}
        {quantity === 1 && (
          <span className="absolute left-2 top-2 rounded-full bg-red-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            ⚡ Only 1 left
          </span>
        )}
        {quantity > 1 && quantity < 5 && (
          <span className="absolute left-2 top-2 rounded-full bg-orange-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow">
            🔥 Low Stock
          </span>
        )}
        {quantity <= 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-gray-700 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-200 shadow">
            Sold Out
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-white">
          {name}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-1">
          <span className="font-display text-lg font-bold text-brand-300">
            {formatCents(priceCents)}
          </span>
          {compareAtCents && compareAtCents > priceCents && (
            <span className="text-xs text-gray-500 line-through">{formatCents(compareAtCents)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
