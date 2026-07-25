import nodemailer from "nodemailer";

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (!value) return fallback;
  return value.trim().toLowerCase() === "true";
}

function parsePort(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.SMTP_FROM_EMAIL,
  );
}

function getTransportConfig() {
  return {
    host: process.env.SMTP_HOST,
    port: parsePort(process.env.SMTP_PORT, 465),
    secure: parseBoolean(process.env.SMTP_SECURE, true),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
}

export function getMailerFrom() {
  const address = process.env.SMTP_FROM_EMAIL;
  const name = process.env.SMTP_FROM_NAME?.trim() || "Lotus Pro TCG";

  if (!address) {
    throw new Error("Missing SMTP_FROM_EMAIL.");
  }

  return `"${name.replace(/"/g, "")}" <${address}>`;
}

export async function sendMail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  if (!hasSmtpConfig()) {
    throw new Error("SMTP email is not configured yet. Add SMTP_* environment variables first.");
  }

  const transporter = nodemailer.createTransport(getTransportConfig());

  await transporter.sendMail({
    from: getMailerFrom(),
    to,
    subject,
    html,
    text,
  });
}
