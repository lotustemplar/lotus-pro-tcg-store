import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

export const dynamic = "force-dynamic";

const Body = z.object({ changes: z.array(z.object({ productId: z.string(), expectedQty: z.number().int(), newQty: z.number().int().min(0) })).min(1).max(500) });

// Writes ONLY store Product.quantity. Never touches Mana Pool or TCGplayer.
// Each change is logged as an InventoryEvent (source "inventory-sync") holding before/after for audit and undo.
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const runId = `sync-${new Date().toISOString()}`;
  const result = await prisma.$transaction(async (tx) => {
    const applied: { productId: string; before: number; after: number }[] = []; const skipped: { productId: string; reason: string }[] = [];
    for (const c of parsed.data.changes) {
      const p = await tx.product.findUnique({ where: { id: c.productId }, select: { quantity: true } });
      if (!p) { skipped.push({ productId: c.productId, reason: "not found" }); continue; }
      if (p.quantity !== c.expectedQty) { skipped.push({ productId: c.productId, reason: `store qty changed to ${p.quantity} since review` }); continue; }
      if (p.quantity === c.newQty) continue;
      await tx.product.update({ where: { id: c.productId }, data: { quantity: c.newQty } });
      await tx.inventoryEvent.create({ data: { source: "inventory-sync", externalOrderId: `${runId}|before=${p.quantity}|after=${c.newQty}`, productId: c.productId, quantity: c.newQty - p.quantity } });
      applied.push({ productId: c.productId, before: p.quantity, after: c.newQty });
    }
    return { applied, skipped };
  });
  if (result.applied.length) revalidateCatalogCache();
  return NextResponse.json({ runId, ...result });
}
