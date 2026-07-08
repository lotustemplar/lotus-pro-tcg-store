"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

export function AddToCartButton({
  productId,
  slug,
  name,
  priceCents,
  image,
  quantityAvailable,
  variant = "default",
}: {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  image: string | null;
  quantityAvailable: number;
  variant?: "default" | "compact";
}) {
  const { addItem, open } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = quantityAvailable <= 0;

  const className =
    variant === "compact"
      ? "w-full rounded-md bg-brand-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
      : "w-full rounded-lg bg-brand-600 px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400";

  return (
    <button
      disabled={soldOut}
      onClick={() => {
        addItem({ productId, slug, name, priceCents, image, maxQuantity: quantityAvailable });
        setAdded(true);
        open();
        setTimeout(() => setAdded(false), 1500);
      }}
      className={className}
    >
      {soldOut ? "Sold Out" : added ? "Added" : "Add to Cart"}
    </button>
  );
}
