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

type ConfirmationItem = {
  nameSnapshot: string;
  setName?: string | null;
  quantity: number;
  lineTotalCents: number;
};

function getDisplayItemName(item: ConfirmationItem) {
  const setName = item.setName?.trim();
  return setName ? `${setName} - ${item.nameSnapshot}` : item.nameSnapshot;
}

export function buildOrderConfirmationEmail({
  siteSettings,
  siteUrl,
  orderId,
  customerName,
  items,
  shippingCents,
  totalCents,
}: {
  siteSettings: SiteSettings;
  siteUrl: string | undefined;
  orderId: string;
  customerName: string | null;
  items: ConfirmationItem[];
  shippingCents: number;
  totalCents: number;
}) {
  const safeBrand = escapeHtml(siteSettings.brandName);
  const safeCustomer = escapeHtml(customerName?.trim() || "Collector");
  const safeOrder = escapeHtml(orderId.slice(0, 10));
  const wideLogoUrl = absoluteUrl(siteSettings.logoWideUrl, siteUrl);
  const squareLogoUrl = absoluteUrl(siteSettings.logoSquareUrl, siteUrl);
  const logoUrl = [wideLogoUrl, squareLogoUrl].find((candidate) => isEmailSafeImageUrl(candidate)) ?? null;
  const preheader = escapeHtml(
    `${siteSettings.brandName} order ${orderId.slice(0, 10)} is confirmed.`,
  );

  const displayItems = items.map((item) => ({
    ...item,
    displayName: getDisplayItemName(item),
  }));

  const itemsHtml = displayItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${escapeHtml(item.displayName)}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(
            formatCents(item.lineTotalCents),
          )}</td>
        </tr>
      `,
    )
    .join("");

  const itemsText = displayItems
    .map((item) => `- ${item.displayName} x${item.quantity} (${formatCents(item.lineTotalCents)})`)
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
                  Order Confirmed
                </div>
                <div style="font-size:28px;line-height:1.2;font-weight:700;color:#ffffff;padding-top:10px;">
                  Thank you for your order.
                </div>
                <div style="font-size:15px;line-height:1.7;color:#d1d5db;padding-top:12px;">
                  Hi ${safeCustomer}, we received your order and payment successfully. We will send another email once your order ships.
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <div style="font-size:11px;line-height:1.4;letter-spacing:0.18em;text-transform:uppercase;color:#6b7280;">
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
                  Thank you for supporting ${safeBrand}. We appreciate every order and will keep you updated as soon as your package is on the move.
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
    "",
    "Items:",
    itemsText,
    "",
    `Shipping: ${formatCents(shippingCents)}`,
    `Order total: ${formatCents(totalCents)}`,
    "",
    `We will email you again once your order ships.`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `${siteSettings.brandName} order confirmation ${orderId.slice(0, 10)}`,
    html,
    text,
  };
}
