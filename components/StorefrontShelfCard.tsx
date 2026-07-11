"use client";

import Link from "next/link";
import { AddToCartButton } from "./AddToCartButton";
import { FeaturedStockOverlay } from "./FeaturedStockOverlay";

type StorefrontShelfCardProps = {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  setName?: string | null;
  priceCents: number;
  compareAtCents?: number | null;
  image: string | null;
  quantity: number;
  featuredStockOverlay?: boolean;
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function StorefrontShelfCard({
  id,
  slug,
  name,
  displayName,
  setName,
  priceCents,
  compareAtCents,
  image,
  quantity,
  featuredStockOverlay = false,
}: StorefrontShelfCardProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#0f1524,#0a0f1a)] shadow-[0_18px_40px_rgba(2,6,16,0.38)]">
      <Link href={`/product/${slug}`} className="block border-b border-white/8">
        <div className="relative flex aspect-[1.15] items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_68%)] p-5">
          {featuredStockOverlay ? <FeaturedStockOverlay quantity={quantity} /> : null}
          {image ? (
            <img src={image} alt={name} className="max-h-full w-auto object-contain" />
          ) : (
            <div className="text-sm text-gray-500">No Image</div>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${slug}`} className="block">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gray-500">
              {setName || "Featured Product"}
            </p>
            <h3 className="line-clamp-2 min-h-[3.5rem] text-base font-medium leading-6 text-white" title={name}>
              {displayName || name}
            </h3>
          </div>
        </Link>
        <div className="mt-3 space-y-1">
          <div className="text-2xl font-semibold text-white">{formatPrice(priceCents)}</div>
          {compareAtCents && compareAtCents > priceCents ? (
            <div className="text-xs text-gray-500 line-through">{formatPrice(compareAtCents)}</div>
          ) : null}
        </div>
        <div className="mt-4">
          <AddToCartButton
            productId={id}
            slug={slug}
            name={name}
            priceCents={priceCents}
            image={image}
            quantityAvailable={quantity}
            variant="compact"
          />
        </div>
      </div>
    </div>
  );
}
