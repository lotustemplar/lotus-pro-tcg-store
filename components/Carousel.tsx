"use client";

import { useRef } from "react";
import { ProductCard } from "./ProductCard";

export type CarouselProduct = {
  slug: string;
  name: string;
  priceCents: number;
  compareAtCents?: number | null;
  image: string | null;
  quantity: number;
};

export function Carousel({ products }: { products: CarouselProduct[] }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <button
        aria-label="Scroll left"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-4 rounded-full border border-border bg-bg-panel/90 p-3 text-white shadow-lg backdrop-blur hover:bg-brand-600 hover:border-brand-500"
      >
        ‹
      </button>
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth px-1 py-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((p) => (
          <div key={p.slug} className="w-[45%] flex-none sm:w-[30%] lg:w-[22%]">
            <ProductCard {...p} />
          </div>
        ))}
      </div>
      <button
        aria-label="Scroll right"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-4 rounded-full border border-border bg-bg-panel/90 p-3 text-white shadow-lg backdrop-blur hover:bg-brand-600 hover:border-brand-500"
      >
        ›
      </button>
    </div>
  );
}
