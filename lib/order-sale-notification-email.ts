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

function getLogoUrl(siteSettings: SiteSettings, siteUrl: string | undefined) {
  const wideLogoUrl = absoluteUrl(siteSettings.logoWideUrl, siteUrl);
  const squareLogoUrl = absoluteUrl(siteSettings.logoSquareUrl, siteUrl);
  return [wideLogoUrl, squareLogoUrl].find((candidate) => isEmailSafeImageUrl(candidate)) ?? null;
}

type SaleNotificationItem = {
  nameSnapshot: string;
  setName?: string | null;
  quantity: number;
  lineTotalCents: number;
};

type ShippingSnapshot = {
  name?: string | null;
  phone?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
  } | null;
} | null;

function getDisplayItemName(item: SaleNotificationItem) {
  const setName = item.setName?.trim();
  return setName ? `${setName} - ${item.nameSnapshot}` : item.nameSnapshot;
}

function getShippingLines(shipping: ShippingSnapshot) {
  if (!shipping?.address) return [];

  const lines = [
    shipping.address.line1?.trim(),
    shipping.address.line2?.trim(),
    [shipping.address.city?.trim(), shipping.address.state?.trim(), shipping.address.postal_code?.trim()]
      .filter(Boolean)
      .join(", "),
    shipping.address.country?.trim(),
  ].filter((value): value is string => Boolean(value));

  return lines;
}

export function buildOrderSaleNotificationEmail({
  siteSettings,
  siteUrl,
  orderId,
  customerEmail,
  customerName,
  shipping,
  items,
  subtotalCents,
  shippingCents,
  totalCents,
}: {
  siteSettings: SiteSettings;
  siteUrl: string | undefined;
  orderId: string;
  customerEmail: string;
  customerName: string | null;
  shipping: ShippingSnapshot;
  items: SaleNotificationItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
}) {
  const safeBrand = escapeHtml(siteSettings.brandName);
  const safeOrder = escapeHtml(orderId.slice(0, 10));
  const safeCustomerName = escapeHtml(customerName?.trim() || "Customer");
  const safeCustomerEmail = escapeHtml(customerEmail);
  const logoUrl = getLogoUrl(siteSettings, siteUrl);
  const adminOrderUrl = siteUrl ? new URL(`/admin/orders/${orderId}`, siteUrl).toString() : null;
  const shippingLines = getShippingLines(shipping);

  const itemsHtml = items
    .map((item) => {
      const displayName = getDisplayItemName(item);
      return `
        <tr>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;">${escapeHtml(displayName)}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;text-align:right;">${escapeHtml(
            formatCents(item.lineTotalCents),
          )}</td>
        </tr>
      `;
    })
    .join("");

  const shippingHtml =
    shippingLines.length > 0
      ? shippingLines.map((line) => `<div>${escapeHtml(line)}</div>`).join("")
      : `<div style="color:#9ca3af;">No shipping address captured yet.</div>`;

  const itemsText = items
    .map((item) => `- ${getDisplayItemName(item)} x${item.quantity} (${formatCents(item.lineTotalCents)})`)
    .join("\n");

  const textLines = [
    `New paid order for ${siteSettings.brandName}`,
    "",
    `Order: ${orderId.slice(0, 10)}`,
    `Customer: ${customerName?.trim() || "Customer"}`,
    `Email: ${customerEmail}`,
    shipping?.phone ? `Phone: ${shipping.phone}` : null,
    "",
    "Ship to:",
    ...(shippingLines.length > 0 ? shippingLines : ["No shipping address captured yet."]),
    "",
    "Items:",
    itemsText,
    "",
    `Subtotal: ${formatCents(subtotalCents)}`,
    `Shipping: ${formatCents(shippingCents)}`,
    `Total: ${formatCents(totalCents)}`,
    adminOrderUrl ? "" : null,
    adminOrderUrl ? `Review order: ${adminOrderUrl}` : null,
  ].filter(Boolean);

  return {
    subject: `New paid order | ${siteSettings.brandName} | ${orderId.slice(0, 10)}`,
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#eef2f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:700px;background:#ffffff;border:1px solid #dbe3ef;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:#111827;color:#ffffff;">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="${safeBrand}" style="max-width:180px;height:auto;display:block;margin-bottom:18px;" />`
                    : `<div style="font-size:24px;line-height:1.2;font-weight:700;letter-spacing:0.01em;margin:0 0 16px;">${safeBrand}</div>`
                }
                <div style="font-size:11px;line-height:1.4;letter-spacing:0.22em;text-transform:uppercase;color:#cbd5e1;">New Sale</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">A paid order just came in.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;width:160px;">Order</td>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">${safeOrder}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Customer</td>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;font-weight:700;">${safeCustomerName}</td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Email</td>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;"><a href="mailto:${safeCustomerEmail}" style="color:#4f46e5;text-decoration:none;">${safeCustomerEmail}</a></td>
                  </tr>
                  ${
                    shipping?.phone
                      ? `<tr>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#6b7280;">Phone</td>
                    <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;color:#111827;">${escapeHtml(shipping.phone)}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding:10px 0;color:#6b7280;vertical-align:top;">Ship to</td>
                    <td style="padding:10px 0;color:#111827;line-height:1.7;">${shippingHtml}</td>
                  </tr>
                </table>

                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:20px;border-collapse:collapse;font-size:14px;color:#111827;">
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
                    <td style="padding-top:14px;font-size:14px;line-height:1.6;color:#374151;">Subtotal</td>
                    <td align="right" style="padding-top:14px;font-size:14px;line-height:1.6;color:#111827;font-weight:700;">${escapeHtml(
                      formatCents(subtotalCents),
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding-top:8px;font-size:14px;line-height:1.6;color:#374151;">Shipping</td>
                    <td align="right" style="padding-top:8px;font-size:14px;line-height:1.6;color:#111827;font-weight:700;">${escapeHtml(
                      formatCents(shippingCents),
                    )}</td>
                  </tr>
                  <tr>
                    <td style="padding-top:8px;font-size:16px;line-height:1.6;color:#111827;font-weight:700;">Order Total</td>
                    <td align="right" style="padding-top:8px;font-size:16px;line-height:1.6;color:#111827;font-weight:700;">${escapeHtml(
                      formatCents(totalCents),
                    )}</td>
                  </tr>
                </table>

                ${
                  adminOrderUrl
                    ? `<div style="padding-top:24px;">
                  <a href="${adminOrderUrl}" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:700;">Open order in admin</a>
                </div>`
                    : ""
                }
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: textLines.join("\n"),
  };
}
