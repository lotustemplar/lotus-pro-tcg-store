export const TCGPLAYER_PRICE_DISCOUNT = 0.05;

export function getDiscountedStorePriceCents(sourcePriceCents: number) {
  return Math.max(0, Math.round(sourcePriceCents * (1 - TCGPLAYER_PRICE_DISCOUNT)));
}

export function applyTrackedTcgplayerPricing({
  autoUpdatePrice,
  priceCents,
  sourcePriceCents,
}: {
  autoUpdatePrice: boolean;
  priceCents: number;
  sourcePriceCents: number | null | undefined;
}) {
  if (sourcePriceCents == null) {
    return {
      compareAtCents: null as number | null,
      priceCents,
    };
  }

  return {
    compareAtCents: sourcePriceCents,
    priceCents: autoUpdatePrice ? getDiscountedStorePriceCents(sourcePriceCents) : priceCents,
  };
}
