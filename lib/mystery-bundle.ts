export const MYSTERY_BUNDLE_SKU = "MYSTERY-BOOSTER-BUNDLE";
export const MYSTERY_BUNDLE_SLUG = "mystery-booster-bundle";
export const MYSTERY_BUNDLE_PRICE_CENTS = 3299;
export const MYSTERY_BUNDLE_BATCH_SIZE = 30;
export const MYSTERY_BUNDLE_DISCOUNT_PERCENT = 5;

export function mysteryBundleDiscountedUnitCents(priceCents: number, quantity: number) {
  return quantity >= 2
    ? Math.floor((priceCents * (100 - MYSTERY_BUNDLE_DISCOUNT_PERCENT)) / 100)
    : priceCents;
}
