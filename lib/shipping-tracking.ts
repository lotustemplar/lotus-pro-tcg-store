const CARRIER_TRACKING_URLS = {
  UPS: (trackingNumber: string) => `https://www.ups.com/track?tracknum=${encodeURIComponent(trackingNumber)}`,
  USPS: (trackingNumber: string) =>
    `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(trackingNumber)}`,
  FedEx: (trackingNumber: string) =>
    `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(trackingNumber)}`,
  DHL: (trackingNumber: string) =>
    `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${encodeURIComponent(trackingNumber)}`,
} as const;

export const TRACKING_CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Other"] as const;

export type TrackingCarrier = (typeof TRACKING_CARRIERS)[number];

export function normalizeTrackingCarrier(value: string | null | undefined): TrackingCarrier {
  const normalized = value?.trim();

  if (!normalized) return "Other";
  if (normalized === "UPS" || normalized === "USPS" || normalized === "FedEx" || normalized === "DHL") {
    return normalized;
  }

  return "Other";
}

export function buildTrackingUrl(carrier: string | null | undefined, trackingNumber: string) {
  const normalizedCarrier = normalizeTrackingCarrier(carrier);

  if (normalizedCarrier === "Other") return null;

  return CARRIER_TRACKING_URLS[normalizedCarrier](trackingNumber);
}
