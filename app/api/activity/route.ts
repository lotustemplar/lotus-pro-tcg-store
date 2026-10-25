import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const schema = z.object({
  sessionId: z.string().min(8).max(64),
  action: z.enum(["add_to_cart", "remove_from_cart", "checkout_started"]),
  productId: z.string().max(40).optional(),
  quantity: z.number().int().min(1).max(999).optional(),
  path: z.string().max(200).optional(),
});

// Visitor actions only. No email, address or payment data is accepted here.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  const d = parsed.data;
  const product = d.productId ? await prisma.product.findUnique({ where: { id: d.productId }, select: { id: true, priceCents: true } }) : null;
  await prisma.visitorActivity.create({
    data: { sessionId: d.sessionId, action: d.action, productId: product?.id ?? null, quantity: d.quantity ?? 1, priceCents: product?.priceCents ?? null, path: d.path ?? null },
  });
  return NextResponse.json({ ok: true });
}
