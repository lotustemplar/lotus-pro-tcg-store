"use client";

import { useRef } from "react";
import { ProductCard } from "./ProductCard";

export type CarouselProduct = {
  slug: string;
  name: string;
  displayName?: string;
  setName?: string | null;
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
    const amount = el.clientWidth * 0.82;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }

  if (products.length === 0) return null;

  return (
    <div className="relative">
      <button
        aria-label="Scroll left"
        onClick={() => scroll("left")}
        className="absolute left-0 top-1/2 z-10 hidden h-12 w-12 -translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#10172a]/92 text-lg font-bold text-white shadow-[0_20px_50px_rgba(4,8,20,0.45)] backdrop-blur-xl transition hover:border-brand-400/60 hover:bg-brand-500/14 md:flex"
      >
        {"<"}
      </button>

      <div
        ref={trackRef}
        className="flex gap-5 overflow-x-auto scroll-smooth px-1 py-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div key={product.slug} className="w-[78%] flex-none sm:w-[46%] lg:w-[30%] xl:w-[24%]">
            <ProductCard {...product} />
          </div>
        ))}
      </div>

      <button
        aria-label="Scroll right"
        onClick={() => scroll("right")}
        className="absolute right-0 top-1/2 z-10 hidden h-12 w-12 translate-x-4 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-[#10172a]/92 text-lg font-bold text-white shadow-[0_20px_50px_rgba(4,8,20,0.45)] backdrop-blur-xl transition hover:border-brand-400/60 hover:bg-brand-500/14 md:flex"
      >
        {">"}
      </button>
    </div>
  );
}
