"use client";

import { useEffect, useState } from "react";
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

const BATCH_SIZE = 3;
const ROTATE_MS = 3000;

function getVisibleProducts(products: FeaturedProduct[], startIndex: number) {
  const count = Math.min(BATCH_SIZE, products.length);
  return Array.from({ length: count }, (_, index) => products[(startIndex + index) % products.length]);
}

function getBatchCount(length: number) {
  if (length <= BATCH_SIZE) return 1;
  return Math.ceil(length / BATCH_SIZE);
}

function getBatchIndex(length: number, startIndex: number) {
  if (length <= BATCH_SIZE) return 0;
  return Math.floor(startIndex / BATCH_SIZE) % getBatchCount(length);
}

function BatchIndicators({ count, activeIndex }: { count: number; activeIndex: number }) {
  if (count <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            index === activeIndex ? "w-6 bg-brand-300" : "w-2 bg-white/20"
          }`}
        />
      ))}
    </div>
  );
}

export function RotatingHeroFeaturedList({ products }: { products: FeaturedProduct[] }) {
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (products.length <= BATCH_SIZE) return;

    const timer = window.setInterval(() => {
      setStartIndex((current) => (current + BATCH_SIZE) % products.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [products.length]);

  const visibleProducts = getVisibleProducts(products, startIndex);
  const batchCount = getBatchCount(products.length);
  const activeBatchIndex = getBatchIndex(products.length, startIndex);

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {visibleProducts.map((product) => (
          <HeroFeaturedProductCard key={`${product.id}-${startIndex}`} product={product} />
        ))}
      </div>
      <BatchIndicators count={batchCount} activeIndex={activeBatchIndex} />
    </div>
  );
}

export function RotatingFeaturedShelf({ products }: { products: FeaturedProduct[] }) {
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    if (products.length <= BATCH_SIZE) return;

    const timer = window.setInterval(() => {
      setStartIndex((current) => (current + BATCH_SIZE) % products.length);
    }, ROTATE_MS);

    return () => window.clearInterval(timer);
  }, [products.length]);

  const visibleProducts = getVisibleProducts(products, startIndex);
  const batchCount = getBatchCount(products.length);
  const activeBatchIndex = getBatchIndex(products.length, startIndex);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        {visibleProducts.map((product) => (
          <StorefrontShelfCard
            key={`${product.id}-${startIndex}`}
            id={product.id}
            slug={product.slug}
            name={product.name}
            displayName={getDisplayProductName(product.name, product.sourceSetName)}
            setName={product.sourceSetName}
            priceCents={product.priceCents}
            compareAtCents={product.compareAtCents}
            image={product.images[0]?.url ?? null}
            quantity={product.quantity}
          />
        ))}
      </div>
      <BatchIndicators count={batchCount} activeIndex={activeBatchIndex} />
    </div>
  );
}
