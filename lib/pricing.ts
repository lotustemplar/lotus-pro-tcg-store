export const TCGPLAYER_PRICE_DISCOUNT = 0.05;
export const TCGPLAYER_MAX_DISCOUNT_CENTS = 2500;

export function getDiscountAmountCents(sourcePriceCents: number) {
  return Math.min(
    TCGPLAYER_MAX_DISCOUNT_CENTS,
    Math.max(0, Math.round(sourcePriceCents * TCGPLAYER_PRICE_DISCOUNT)),
  );
}

export function getDiscountedStorePriceCents(sourcePriceCents: number) {
  return Math.max(0, sourcePriceCents - getDiscountAmountCents(sourcePriceCents));
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
