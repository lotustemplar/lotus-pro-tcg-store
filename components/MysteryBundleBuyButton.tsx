"use client";

import { useState } from "react";
import { useCart } from "./CartContext";

export function MysteryBundleBuyButton({
  product,
}: {
  product: {
    id: string;
    slug: string;
    name: string;
    priceCents: number;
    quantity: number;
    image: string | null;
  };
}) {
  const { addItem, open } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.quantity <= 0;

  return (
    <div className="flex w-full flex-col items-start gap-3">
      <button
        type="button"
        disabled={soldOut}
        onClick={() => {
          addItem({
            productId: product.id,
            slug: product.slug,
            name: product.name,
            priceCents: product.priceCents,
            image: product.image,
            maxQuantity: product.quantity,
          });
          setAdded(true);
          open();
          window.setTimeout(() => setAdded(false), 1800);
        }}
        className="w-full max-w-xl animate-pulse rounded-2xl border-2 border-gold bg-gold px-8 py-6 text-center font-display text-xl font-black uppercase tracking-[0.14em] text-[#171007] shadow-[0_0_0_1px_rgba(245,215,110,0.3),0_0_34px_rgba(212,175,55,0.6)] transition hover:animate-none hover:bg-[#f5d76e] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.42),0_0_48px_rgba(212,175,55,0.85)] disabled:cursor-not-allowed disabled:animate-none disabled:border-gray-600 disabled:bg-gray-700 disabled:text-gray-400 sm:px-12 sm:py-7 sm:text-2xl"
      >
        {soldOut ? "SOLD OUT" : added ? "ADDED TO CART" : "BUY YOURS NOW!"}
      </button>
      {!soldOut && (
        <p className="text-sm font-semibold text-gold">Buy 2 or more bundles and save 5% automatically at checkout.</p>
      )}
    </div>
  );
}
