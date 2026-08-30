"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { HeroSlide } from "@/lib/site-settings";

export function HeroBannerCarousel({
  slides,
  brandName,
}: {
  slides: HeroSlide[];
  brandName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHeroVideoMuted, setIsHeroVideoMuted] = useState(false);
  const heroVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const activeSlide = slides[activeIndex];
    const video = heroVideoRef.current;
    if (!activeSlide?.videoUrl || !video) return;

    video.muted = false;
    void video.play().catch(() => {
      // Browsers may block autoplay with sound. Fall back to autoplay-muted,
      // while keeping the sound control available for the visitor.
      video.muted = true;
      setIsHeroVideoMuted(true);
      void video.play().catch(() => undefined);
    });
  }, [activeIndex, slides]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="relative aspect-[16/9] overflow-hidden rounded-none bg-[radial-gradient(circle_at_top,rgba(124,58,237,0.34),rgba(9,13,22,1)_52%),linear-gradient(135deg,#120f1d_0%,#090d16_46%,#171127_100%)] sm:min-h-[280px] sm:aspect-auto lg:min-h-[520px]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,13,22,0.16),rgba(9,13,22,0.52))]" />
        <div className="absolute inset-x-0 bottom-0 top-0 flex items-center">
          <div className="mx-auto flex w-full max-w-[1500px] px-4 sm:px-8 lg:px-10">
            <div className="max-w-[760px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-200/85 sm:text-xs">
                {brandName}
              </p>
              <h1 className="mt-3 max-w-[12ch] font-display text-[2rem] font-semibold leading-[0.95] text-white sm:text-[3rem] lg:text-[4.5rem]">
                Sealed product, premium accessories, and live TCG inventory.
              </h1>
              <p className="mt-4 max-w-[56ch] text-sm leading-6 text-gray-200/88 sm:text-base sm:leading-7">
                Browse Magic, Pokemon, One Piece, Riftbound, Weiss Schwarz, and more while fresh
                inventory continues landing in the store.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/mystery-booster-bag"
                  className="inline-flex rounded-md border border-brand-300/70 bg-black/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_0_1px_rgba(196,181,253,0.18),0_0_22px_rgba(139,92,246,0.45)] backdrop-blur-sm transition hover:border-white hover:bg-brand-700/40 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_28px_rgba(139,92,246,0.58)] sm:px-6 sm:py-3 sm:text-sm sm:tracking-[0.22em]"
                >
                  Buy Mystery Booster
                </Link>
                <Link
                  href="/category/pokemon"
                  className="inline-flex rounded-md border border-white/15 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/35 hover:bg-white/[0.08] sm:px-6 sm:py-3 sm:text-sm sm:tracking-[0.22em]"
                >
                  Shop Pokemon
                </Link>
                <Link
                  href="/category/one-piece"
                  className="inline-flex rounded-md border border-white/15 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white transition hover:border-white/35 hover:bg-white/[0.08] sm:px-6 sm:py-3 sm:text-sm sm:tracking-[0.22em]"
                >
                  Shop One Piece
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-[16/9] overflow-hidden rounded-none bg-[#120f1d] sm:min-h-[280px] sm:aspect-auto lg:min-h-[520px]">
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide, index) => {
          const isMysteryVideoHero = index === 0 && !!slide.videoUrl;
          const buttonLabel = isMysteryVideoHero ? "BUY MYSTERY BOOSTER BUNDLE" : slide.buttonLabel;
          const buttonHref = isMysteryVideoHero ? "/mystery-booster-bag" : slide.buttonHref;

          return (
          <div
            key={slide.id}
            className="relative aspect-[16/9] w-full flex-none sm:min-h-[280px] sm:aspect-auto lg:min-h-[520px]"
          >
            {slide.videoUrl ? (
              <video
                ref={index === activeIndex ? heroVideoRef : undefined}
                className="absolute inset-0 h-full w-full bg-[#120f1d] object-contain object-center"
                autoPlay
                muted={isHeroVideoMuted}
                loop={slide.videoLoop !== false}
                playsInline
                poster={slide.imageUrl ?? undefined}
                controlsList="nodownload"
                disablePictureInPicture
                onContextMenu={(event) => event.preventDefault()}
                aria-label={`${brandName} ${slide.name}`}
              >
                <source src={slide.videoUrl} type="video/mp4" />
              </video>
            ) : slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt={`${brandName} ${slide.name}`}
                className="absolute inset-0 h-full w-full object-cover object-center sm:object-cover"
              />
            ) : null}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(9,13,22,0.12),rgba(9,13,22,0.28))]" />
            <div
              className={
                isMysteryVideoHero
                  ? "absolute inset-0 flex items-center justify-center px-4"
                  : "absolute bottom-3 left-3 sm:bottom-8 sm:left-8 lg:bottom-10 lg:left-10"
              }
            >
              <Link
                href={buttonHref}
                className={
                  isMysteryVideoHero
                    ? "inline-flex min-w-[280px] items-center justify-center rounded-xl border border-brand-200/80 bg-black/50 px-8 py-5 text-center text-base font-black uppercase tracking-[0.16em] text-white shadow-[0_0_0_1px_rgba(196,181,253,0.24),0_0_34px_rgba(139,92,246,0.62)] backdrop-blur-md transition hover:border-white hover:bg-brand-700/55 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.22),0_0_44px_rgba(139,92,246,0.78)] sm:min-w-[390px] sm:px-12 sm:py-6 sm:text-xl sm:tracking-[0.2em] lg:min-w-[460px] lg:py-7 lg:text-2xl"
                    : "inline-flex rounded-md border border-brand-300/70 bg-black/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_0_0_1px_rgba(196,181,253,0.18),0_0_22px_rgba(139,92,246,0.45)] backdrop-blur-sm transition hover:border-white hover:bg-brand-700/40 hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18),0_0_28px_rgba(139,92,246,0.58)] sm:px-6 sm:py-3 sm:text-sm sm:tracking-[0.22em]"
                }
              >
                {buttonLabel}
              </Link>
            </div>
          </div>
          );
        })}
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

      {slides[activeIndex]?.videoUrl && (
        <button
          type="button"
          aria-label={isHeroVideoMuted ? "Enable hero video sound" : "Mute hero video sound"}
          onClick={() => setIsHeroVideoMuted((muted) => !muted)}
          className="absolute left-4 top-4 rounded-md border border-white/25 bg-black/55 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-sm transition hover:border-white/60 hover:bg-black/75"
        >
          {isHeroVideoMuted ? "Enable Sound" : "Mute Sound"}
        </button>
      )}
    </div>
  );
}
