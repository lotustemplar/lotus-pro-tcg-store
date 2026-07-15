"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { HeroFeaturedProductCard } from "./HeroFeaturedProductCard";
import { StorefrontShelfCard } from "./StorefrontShelfCard";
import { getDisplayProductName } from "@/lib/product-display";

type FeaturedProduct = {
  id: string;
  slug: string;
  name: string;
  sourceSetName: string | null;
  priceCents: number;
  compareAtCents: number | null;
  quantity: number;
  images: { url: string }[];
};

const DESKTOP_BATCH_SIZE = 3;
const MOBILE_BATCH_SIZE = 1;
const ROTATE_MS = 5000;
const TRANSITION_MS = 420;

function getBatchCount(length: number, batchSize: number) {
  if (length <= batchSize) return 1;
  return Math.ceil(length / batchSize);
}

function getBatchProducts(products: FeaturedProduct[], batchIndex: number, batchSize: number) {
  const start = batchIndex * batchSize;
  return products.slice(start, start + batchSize);
}

function ArrowButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={direction === "previous" ? "Show previous featured products" : "Show next featured products"}
      onClick={onClick}
      className={`absolute top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#090d16]/92 text-lg font-semibold text-white shadow-[0_18px_45px_rgba(2,6,16,0.42)] backdrop-blur-xl transition hover:border-brand-400/60 hover:bg-brand-500/14 ${
        direction === "previous" ? "-left-3" : "-right-3"
      }`}
    >
      {direction === "previous" ? "‹" : "›"}
    </button>
  );
}

function BatchIndicators({
  count,
  activeIndex,
  onSelect,
}: {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}) {
  if (count <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          aria-label={`Show featured batch ${index + 1}`}
          onClick={() => onSelect(index)}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === activeIndex ? "w-6 bg-brand-300" : "w-2 bg-white/20 hover:bg-white/40"
          }`}
        />
      ))}
    </div>
  );
}

function useFeaturedRotation(products: FeaturedProduct[], batchSize: number) {
  const batchCount = useMemo(() => getBatchCount(products.length, batchSize), [batchSize, products.length]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoTimerRef = useRef<number | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const isTransitioningRef = useRef(false);

  function clearTimers() {
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  }

  function goToIndex(nextIndex: number) {
    if (batchCount <= 1 || isTransitioningRef.current) return;
    const normalized = ((nextIndex % batchCount) + batchCount) % batchCount;
    if (normalized === batchIndex) return;

    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
      autoTimerRef.current = null;
    }

    isTransitioningRef.current = true;
    setIsTransitioning(true);
    transitionTimerRef.current = window.setTimeout(() => {
      setBatchIndex(normalized);
      setIsTransitioning(false);
      isTransitioningRef.current = false;
      transitionTimerRef.current = null;
    }, TRANSITION_MS / 2);
  }

  function goNext() {
    goToIndex(batchIndex + 1);
  }

  function goPrevious() {
    goToIndex(batchIndex - 1);
  }

  useEffect(() => {
    if (batchIndex >= batchCount) {
      setBatchIndex(0);
    }
  }, [batchCount, batchIndex]);

  useEffect(() => {
    if (batchCount <= 1) return;
    if (autoTimerRef.current) {
      window.clearTimeout(autoTimerRef.current);
    }
    autoTimerRef.current = window.setTimeout(() => {
      goToIndex(batchIndex + 1);
    }, ROTATE_MS);

    return () => {
      if (autoTimerRef.current) {
        window.clearTimeout(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [batchCount, batchIndex]);

  useEffect(
    () => () => {
      clearTimers();
    },
    [],
  );

  return {
    batchCount,
    batchIndex,
    currentProducts: getBatchProducts(products, batchIndex, batchSize),
    isTransitioning,
    goNext,
    goPrevious,
    goToIndex,
  };
}

export function RotatingHeroFeaturedList({ products }: { products: FeaturedProduct[] }) {
  const { batchCount, batchIndex, currentProducts, isTransitioning, goNext, goPrevious, goToIndex } =
    useFeaturedRotation(products, DESKTOP_BATCH_SIZE);

  return (
    <div className="space-y-3">
      <div className="relative">
        {batchCount > 1 && <ArrowButton direction="previous" onClick={goPrevious} />}
        <div
          className={`space-y-3 transition-all duration-[420ms] ease-out ${
            isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          {currentProducts.map((product) => (
            <HeroFeaturedProductCard key={`${product.id}-${batchIndex}`} product={product} />
          ))}
        </div>
        {batchCount > 1 && <ArrowButton direction="next" onClick={goNext} />}
      </div>
      <BatchIndicators count={batchCount} activeIndex={batchIndex} onSelect={goToIndex} />
    </div>
  );
}

export function MobileHeroFeaturedWidget({ products }: { products: FeaturedProduct[] }) {
  const { batchCount, batchIndex, currentProducts, isTransitioning, goNext, goPrevious, goToIndex } =
    useFeaturedRotation(products, MOBILE_BATCH_SIZE);
  const activeProduct = currentProducts[0];

  if (!activeProduct) return null;

  return (
    <div className="space-y-3 rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,10,18,0.74),rgba(7,10,18,0.94))] p-3 shadow-[0_24px_70px_rgba(2,6,16,0.48)] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-200/80">
            Featured Right Now
          </p>
        </div>
        <div className="flex items-center gap-2">
          {batchCount > 1 ? (
            <>
              <button
                type="button"
                aria-label="Show previous featured product"
                onClick={goPrevious}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-base font-semibold text-white transition hover:border-brand-400/60 hover:bg-brand-500/14"
              >
                {"<"}
              </button>
              <button
                type="button"
                aria-label="Show next featured product"
                onClick={goNext}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-base font-semibold text-white transition hover:border-brand-400/60 hover:bg-brand-500/14"
              >
                {">"}
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        className={`transition-all duration-[420ms] ease-out ${
          isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        <HeroFeaturedProductCard key={`${activeProduct.id}-${batchIndex}`} product={activeProduct} />
      </div>

      <BatchIndicators count={batchCount} activeIndex={batchIndex} onSelect={goToIndex} />
    </div>
  );
}

export function RotatingFeaturedShelf({ products }: { products: FeaturedProduct[] }) {
  const { batchCount, batchIndex, currentProducts, isTransitioning, goNext, goPrevious, goToIndex } =
    useFeaturedRotation(products, DESKTOP_BATCH_SIZE);

  return (
    <div className="space-y-4">
      <div className="relative">
        {batchCount > 1 && <ArrowButton direction="previous" onClick={goPrevious} />}
        <div
          className={`grid gap-4 transition-all duration-[420ms] ease-out xl:grid-cols-3 ${
            isTransitioning ? "translate-y-3 opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          {currentProducts.map((product) => (
            <StorefrontShelfCard
              key={`${product.id}-${batchIndex}`}
              id={product.id}
              slug={product.slug}
              name={product.name}
              displayName={getDisplayProductName(product.name, product.sourceSetName)}
              setName={product.sourceSetName}
              priceCents={product.priceCents}
              compareAtCents={product.compareAtCents}
              image={product.images[0]?.url ?? null}
              quantity={product.quantity}
              featuredStockOverlay
            />
          ))}
        </div>
        {batchCount > 1 && <ArrowButton direction="next" onClick={goNext} />}
      </div>
      <BatchIndicators count={batchCount} activeIndex={batchIndex} onSelect={goToIndex} />
    </div>
  );
}
