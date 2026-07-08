"use client";

import { useCart } from "./CartContext";
import { useState } from "react";

export function AddToCartButton({
  productId,
  slug,
  name,
  priceCents,
  image,
  quantityAvailable,
}: {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  image: string | null;
  quantityAvailable: number;
}) {
  const { addItem, open } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = quantityAvailable <= 0;

  return (
    <button
      disabled={soldOut}
      onClick={() => {
        addItem({ productId, slug, name, priceCents, image, maxQuantity: quantityAvailable });
        setAdded(true);
        open();
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded-lg bg-brand-600 px-6 py-4 font-display text-lg font-bold uppercase tracking-wide text-white transition hover:bg-brand-500 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
    >
      {soldOut ? "Sold Out" : added ? "Added ✓" : "Add to Cart"}
    </button>
  );
}
