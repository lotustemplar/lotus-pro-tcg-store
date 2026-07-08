"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { HeroSlide } from "@/lib/site-settings";

export function HeroBannerCarousel({
  slides,
  brandName,
}: {
  slides: HeroSlide[];
  brandName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="relative min-h-[280px] overflow-hidden rounded-none bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.45),rgba(9,13,22,1)_68%)] lg:min-h-[520px]" />
    );
  }

  return (
    <div className="relative min-h-[280px] overflow-hidden rounded-none lg:min-h-[520px]">
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide) => (
          <div key={slide.id} className="relative min-h-[280px] w-full flex-none lg:min-h-[520px]">
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={`${brandName} ${slide.name}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,22,0.12),rgba(9,13,22,0.28))]" />
            <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 lg:bottom-10 lg:left-10">
              <Link
                href={slide.buttonHref}
                className="inline-flex rounded-md border border-brand-300/70 bg-black/35 px-6 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-white shadow-[0_0_0_1px_rgba(196,181,253,0.18),0_0_22px_rgba(139,92,246,0.45)] backdrop-blur-sm transition hover:border-white hover:bg-brand-700/40 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_28px_rgba(139,92,246,0.58)]"
              >
                {slide.buttonLabel}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {slides.length > 1 && (
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Show slide ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition ${
                index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/45 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
