export const FLAT_SHIPPING_CENTS = 599; // $5.99
export const FREE_SHIPPING_THRESHOLD_CENTS = 15000; // $150.00

export function calculateShippingCents(subtotalCents: number): number {
  if (subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS) return 0;
  return FLAT_SHIPPING_CENTS;
}
