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

function isEmailSafeImageUrl(url: string | null) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return [".png", ".jpg", ".jpeg", ".gif", ".webp"].some((extension) => pathname.endsWith(extension));
  } catch {
    return false;
  }
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
  const wideLogoUrl = absoluteUrl(siteSettings.logoWideUrl, siteUrl);
  const squareLogoUrl = absoluteUrl(siteSettings.logoSquareUrl, siteUrl);
  const logoUrl = [wideLogoUrl, squareLogoUrl].find((candidate) => isEmailSafeImageUrl(candidate)) ?? null;
  const preheader = escapeHtml(
    `${siteSettings.brandName} order ${orderId.slice(0, 10)} is on the way. Tracking number: ${trackingNumber}.`,
  );

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
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
      ${preheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2f7;margin:0;padding:0;width:100%;font-family:Arial,sans-serif;">
      <tr>
        <td align="center" style="padding:24px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background:#ffffff;border:1px solid #dbe3ef;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 22px;background:#111827;color:#ffffff;">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="${safeBrand}" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;margin:0 0 16px;" />`
                    : `<div style="font-size:24px;line-height:1.2;font-weight:700;letter-spacing:0.01em;margin:0 0 16px;">${safeBrand}</div>`
                }
                <div style="font-size:11px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:#cbd5e1;">
                  Shipment Update
                </div>
                <div style="font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;padding-top:10px;">
                  Your order is on the way.
                </div>
                <div style="font-size:15px;line-height:1.7;color:#d1d5db;padding-top:12px;">
                  Hi ${safeCustomer}, thank you for shopping with ${safeBrand}. Your shipment details are below.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #e5e7eb;border-radius:16px;background:#f8fafc;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <div style="font-size:11px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">
                        Tracking Information
                      </div>
                      <div style="padding-top:10px;font-size:16px;line-height:1.5;color:#111827;font-weight:700;">
                        ${safeCarrier}
                      </div>
                      <div style="padding-top:4px;font-size:20px;line-height:1.4;color:#111827;font-weight:700;">
                        ${safeTrackingNumber}
                      </div>
                      ${
                        safeTrackingUrl
                          ? `<div style="padding-top:16px;"><a href="${safeTrackingUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:700;">Track Package</a></div>`
                          : ""
                      }
                    </td>
                  </tr>
                </table>

                <div style="padding-top:24px;font-size:11px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">
                  Order ${safeOrder}
                </div>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:12px;border-collapse:collapse;font-size:14px;color:#111827;">
                  <thead>
                    <tr style="background:#f8fafc;color:#6b7280;">
                      <th style="padding:10px 12px;border:1px solid #e5e7eb;text-align:left;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">Item</th>
                      <th style="padding:10px 12px;border:1px solid #e5e7eb;text-align:center;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">Qty</th>
                      <th style="padding:10px 12px;border:1px solid #e5e7eb;text-align:right;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                  </tbody>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:18px;border-top:1px solid #e5e7eb;">
                  <tr>
                    <td style="padding-top:14px;font-size:14px;line-height:1.6;color:#374151;">Shipping</td>
                    <td align="right" style="padding-top:14px;font-size:14px;line-height:1.6;color:#111827;font-weight:700;">
                      ${escapeHtml(formatCents(shippingCents))}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:8px;font-size:16px;line-height:1.6;color:#111827;font-weight:700;">Order Total</td>
                    <td align="right" style="padding-top:8px;font-size:16px;line-height:1.6;color:#111827;font-weight:700;">
                      ${escapeHtml(formatCents(totalCents))}
                    </td>
                  </tr>
                </table>

                <div style="padding-top:24px;font-size:14px;line-height:1.7;color:#4b5563;">
                  Thank you for supporting ${safeBrand}. We appreciate every order and hope everything arrives safely and exactly as expected.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;

  const text = [
    `Thank you for your order from ${siteSettings.brandName}.`,
    customerName?.trim() ? `Customer: ${customerName.trim()}` : null,
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
