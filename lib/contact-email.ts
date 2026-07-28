import type { SiteSettings } from "@/lib/site-settings";

type ContactSubmission = {
  customerName: string;
  customerEmail: string;
  subject: string;
  message: string;
  siteSettings: SiteSettings;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function nl2br(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function getSafeLogoUrl(siteSettings: SiteSettings) {
  const logo = siteSettings.logoWideUrl?.trim() || siteSettings.logoSquareUrl?.trim() || "";
  return logo.startsWith("data:") ? siteSettings.logoSquareUrl : logo;
}

export function getContactDestinationEmail() {
  return (
    process.env.CONTACT_FORM_TO_EMAIL?.trim() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    process.env.SMTP_USER?.trim() ||
    ""
  );
}

export function getContactReplyToEmail() {
  return (
    process.env.CONTACT_FORM_REPLY_TO_EMAIL?.trim() ||
    getContactDestinationEmail() ||
    process.env.SMTP_FROM_EMAIL?.trim() ||
    ""
  );
}

export function buildOwnerContactEmail({
  customerName,
  customerEmail,
  subject,
  message,
  siteSettings,
}: ContactSubmission) {
  const safeBrand = escapeHtml(siteSettings.brandName);
  const safeName = escapeHtml(customerName);
  const safeEmail = escapeHtml(customerEmail);
  const safeSubject = escapeHtml(subject);
  const safeMessage = nl2br(message);
  const logoUrl = getSafeLogoUrl(siteSettings);

  return {
    subject: `[${siteSettings.brandName}] Contact form: ${subject}`,
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b1020;font-family:Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0b1020;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#111827;border:1px solid #312e81;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#1b1335,#0f172a);border-bottom:1px solid rgba(255,255,255,0.08);">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="${safeBrand}" style="max-width:180px;height:auto;display:block;margin-bottom:18px;" />`
                    : ""
                }
                <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#c4b5fd;font-weight:700;">New Customer Message</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">${safeSubject}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#94a3b8;width:140px;">Customer</td>
                    <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#ffffff;font-weight:600;">${safeName}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);color:#94a3b8;">Email</td>
                    <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
                      <a href="mailto:${safeEmail}" style="color:#c4b5fd;text-decoration:none;">${safeEmail}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0;color:#94a3b8;vertical-align:top;">Message</td>
                    <td style="padding:12px 0;color:#e5e7eb;line-height:1.7;">${safeMessage}</td>
                  </tr>
                </table>

                <div style="margin-top:24px;padding:16px 18px;border:1px solid rgba(196,181,253,0.24);border-radius:18px;background:rgba(76,29,149,0.14);color:#ddd6fe;font-size:14px;line-height:1.7;">
                  Reply directly to this email to answer ${safeName}. The customer address is already set as the reply-to.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: [
      `New customer contact for ${siteSettings.brandName}`,
      ``,
      `Subject: ${subject}`,
      `Customer: ${customerName}`,
      `Email: ${customerEmail}`,
      ``,
      message,
      ``,
      `Reply directly to this email to answer the customer.`,
    ].join("\n"),
  };
}

export function buildCustomerContactAutoReply({
  customerName,
  subject,
  siteSettings,
}: Omit<ContactSubmission, "customerEmail" | "message">) {
  const safeBrand = escapeHtml(siteSettings.brandName);
  const safeName = escapeHtml(customerName);
  const safeSubject = escapeHtml(subject);
  const logoUrl = getSafeLogoUrl(siteSettings);

  return {
    subject: `We received your message | ${siteSettings.brandName}`,
    html: `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#0b1020;font-family:Arial,sans-serif;color:#e5e7eb;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#0b1020;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:680px;background:#111827;border:1px solid #312e81;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:24px 28px;background:linear-gradient(135deg,#1b1335,#0f172a);border-bottom:1px solid rgba(255,255,255,0.08);">
                ${
                  logoUrl
                    ? `<img src="${logoUrl}" alt="${safeBrand}" style="max-width:180px;height:auto;display:block;margin-bottom:18px;" />`
                    : ""
                }
                <div style="font-size:12px;letter-spacing:0.22em;text-transform:uppercase;color:#c4b5fd;font-weight:700;">Message Received</div>
                <h1 style="margin:12px 0 0;font-size:28px;line-height:1.2;color:#ffffff;">Thanks for reaching out, ${safeName}.</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;color:#e5e7eb;line-height:1.8;">
                  We received your message about <strong>${safeSubject}</strong> and will get back to you as soon as possible from our official ${safeBrand} email.
                </p>
                <p style="margin:0 0 18px;color:#cbd5e1;line-height:1.8;">
                  Thanks for supporting our family-run store and giving us a chance to help.
                </p>
                <div style="padding:16px 18px;border:1px solid rgba(255,255,255,0.08);border-radius:18px;background:rgba(255,255,255,0.03);color:#e5e7eb;font-size:14px;line-height:1.7;">
                  If you need to add details before we reply, just respond to this email and we will keep everything in one thread.
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: [
      `Thanks for reaching out to ${siteSettings.brandName}.`,
      ``,
      `We received your message about "${subject}" and will reply as soon as possible from our official store email.`,
      ``,
      `If you need to add details, you can reply to this email.`,
    ].join("\n"),
  };
}
