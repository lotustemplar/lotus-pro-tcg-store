export const FLAT_SHIPPING_CENTS = 599; // $5.99
export const FREE_SHIPPING_THRESHOLD_CENTS = 7500; // $75.00

export function qualifiesForFreeShipping(subtotalCents: number): boolean {
  return subtotalCents > FREE_SHIPPING_THRESHOLD_CENTS;
}

export function remainingForFreeShippingCents(subtotalCents: number): number {
  if (qualifiesForFreeShipping(subtotalCents)) return 0;
  return FREE_SHIPPING_THRESHOLD_CENTS + 1 - subtotalCents;
}

export function calculateShippingCents(subtotalCents: number): number {
  if (qualifiesForFreeShipping(subtotalCents)) return 0;
  return FLAT_SHIPPING_CENTS;
}
