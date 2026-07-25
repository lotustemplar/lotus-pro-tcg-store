import { formatCents } from "@/lib/format";
import type { SiteSettings } from "@/lib/site-settings";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function absoluteUrl(pathOrUrl: string | null | undefined, siteUrl: string | undefined) {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  if (!siteUrl) return null;
  return new URL(pathOrUrl, siteUrl).toString();
}

export function buildShipmentEmail({
  siteSettings,
  siteUrl,
  orderId,
  customerName,
  trackingCarrier,
  trackingNumber,
  trackingUrl,
  items,
  shippingCents,
  totalCents,
}: {
  siteSettings: SiteSettings;
  siteUrl: string | undefined;
  orderId: string;
  customerName: string | null;
  trackingCarrier: string | null;
  trackingNumber: string;
  trackingUrl: string | null;
  items: { nameSnapshot: string; quantity: number; lineTotalCents: number }[];
  shippingCents: number;
  totalCents: number;
}) {
  const safeBrand = escapeHtml(siteSettings.brandName);
  const safeCustomer = escapeHtml(customerName?.trim() || "Collector");
  const safeOrder = escapeHtml(orderId.slice(0, 10));
  const safeCarrier = escapeHtml(trackingCarrier?.trim() || "Carrier");
  const safeTrackingNumber = escapeHtml(trackingNumber);
  const safeTrackingUrl = trackingUrl ? escapeHtml(trackingUrl) : null;
  const logoUrl = absoluteUrl(siteSettings.logoWideUrl, siteUrl);

  const itemsHtml = items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${escapeHtml(item.nameSnapshot)}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(
            formatCents(item.lineTotalCents),
          )}</td>
        </tr>
      `,
    )
    .join("");

  const itemsText = items
    .map((item) => `- ${item.nameSnapshot} x${item.quantity} (${formatCents(item.lineTotalCents)})`)
    .join("\n");

  const html = `
    <div style="background:#090d16;padding:32px 16px;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="padding:28px 28px 20px;background:linear-gradient(135deg,#161c2d,#2f1742);color:#ffffff;">
          ${logoUrl ? `<img src="${logoUrl}" alt="${safeBrand}" style="height:44px;max-width:220px;object-fit:contain;display:block;margin-bottom:18px;" />` : ""}
          <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;opacity:0.86;">Shipment Update</div>
          <h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">Thank you for your order.</h1>
          <p style="margin:12px 0 0;font-size:15px;line-height:1.7;color:#d1d5db;">
            Hi ${safeCustomer}, your ${safeBrand} order is on the way.
          </p>
        </div>

        <div style="padding:28px;">
          <div style="border:1px solid #e5e7eb;border-radius:18px;padding:18px 20px;background:#f9fafb;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280;">Tracking Information</div>
            <div style="margin-top:10px;font-size:16px;color:#111827;"><strong>${safeCarrier}</strong></div>
            <div style="margin-top:4px;font-size:18px;color:#111827;font-weight:700;">${safeTrackingNumber}</div>
            ${
              safeTrackingUrl
                ? `<div style="margin-top:16px;"><a href="${safeTrackingUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">Track Package</a></div>`
                : ""
            }
          </div>

          <div style="margin-top:24px;">
            <div style="font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#6b7280;">Order ${safeOrder}</div>
            <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
              <thead>
                <tr style="background:#f9fafb;color:#6b7280;text-transform:uppercase;font-size:11px;letter-spacing:0.14em;">
                  <th style="padding:10px 12px;text-align:left;">Item</th>
                  <th style="padding:10px 12px;text-align:center;">Qty</th>
                  <th style="padding:10px 12px;text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top:18px;border-top:1px solid #e5e7eb;padding-top:14px;font-size:14px;color:#374151;">
              <div style="display:flex;justify-content:space-between;margin-top:6px;">
                <span>Shipping</span>
                <strong>${escapeHtml(formatCents(shippingCents))}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:16px;color:#111827;">
                <span><strong>Order Total</strong></span>
                <strong>${escapeHtml(formatCents(totalCents))}</strong>
              </div>
            </div>
          </div>

          <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#4b5563;">
            Thank you for supporting ${safeBrand}. We truly appreciate your order and hope everything arrives safely and exactly as expected.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = [
    `Thank you for your order from ${siteSettings.brandName}.`,
    "",
    `Order: ${orderId.slice(0, 10)}`,
    `Tracking carrier: ${trackingCarrier?.trim() || "Carrier"}`,
    `Tracking number: ${trackingNumber}`,
    trackingUrl ? `Track here: ${trackingUrl}` : null,
    "",
    "Items:",
    itemsText,
    "",
    `Shipping: ${formatCents(shippingCents)}`,
    `Order total: ${formatCents(totalCents)}`,
    "",
    `Thank you for supporting ${siteSettings.brandName}.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `${siteSettings.brandName} shipment update for order ${orderId.slice(0, 10)}`,
    html,
    text,
  };
}
