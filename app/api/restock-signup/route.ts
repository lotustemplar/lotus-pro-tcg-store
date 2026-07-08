import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  productId: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: parsed.data.productId } });
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

  await prisma.restockNotify.create({
    data: { productId: parsed.data.productId, email: parsed.data.email },
  });

  // NOTE: hook up an email provider (Resend, Postmark, SendGrid) in production —
  // when admin restocks a product, iterate RestockNotify rows where notified=false
  // for that product and send the "back in stock" email, then mark notified=true.

  return NextResponse.json({ ok: true });
}
