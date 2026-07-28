import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  buildCustomerContactAutoReply,
  buildOwnerContactEmail,
  getContactDestinationEmail,
  getContactReplyToEmail,
} from "@/lib/contact-email";
import { sendMail } from "@/lib/mailer";
import { getSiteSettings } from "@/lib/site-settings";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(4000),
  website: z.string().max(0).optional().default(""),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Please fill out all fields correctly." }, { status: 400 });
  }

  const destinationEmail = getContactDestinationEmail();
  const replyToEmail = getContactReplyToEmail();

  if (!destinationEmail) {
    return NextResponse.json(
      { error: "Contact email is not configured yet. Please try again shortly." },
      { status: 500 },
    );
  }

  const siteSettings = await getSiteSettings();
  const { name, email, subject, message } = parsed.data;

  const ownerEmail = buildOwnerContactEmail({
    customerName: name,
    customerEmail: email,
    subject,
    message,
    siteSettings,
  });

  const customerReply = buildCustomerContactAutoReply({
    customerName: name,
    subject,
    siteSettings,
  });

  try {
    await sendMail({
      to: destinationEmail,
      replyTo: email,
      subject: ownerEmail.subject,
      html: ownerEmail.html,
      text: ownerEmail.text,
    });

    await sendMail({
      to: email,
      replyTo: replyToEmail || undefined,
      subject: customerReply.subject,
      html: customerReply.html,
      text: customerReply.text,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Contact form email failed", {
      error: error instanceof Error ? error.message : error,
      destinationEmail,
      customerEmail: email,
    });

    return NextResponse.json(
      { error: "We could not send your message right now. Please try again in a moment." },
      { status: 500 },
    );
  }
}
