import { NextRequest, NextResponse } from "next/server";
import { verifyManapoolSignature } from "@/lib/sync/signature";
import { logIssue, matchManapoolItem, recordSale } from "@/lib/sync/engine";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

export const dynamic = "force-dynamic";

type MpItem = { product_id?: string; product_type?: string; tcgsku?: number | null; quantity?: number; custom_external_id?: string | null };

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyManapoolSignature(raw, req.headers.get("x-manapool-signature"), process.env.MANAPOOL_WEBHOOK_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const event = req.headers.get("x-manapool-event");
  if (event === "verification") return NextResponse.json({ ok: true });
  if (event !== "order_created") return NextResponse.json({ ignored: event });

  const body = JSON.parse(raw) as { order?: { id?: string; items?: MpItem[] } };
  const order = body.order;
  if (!order?.id) return NextResponse.json({ error: "No order" }, { status: 400 });
  let recorded = 0;
  for (const item of order.items ?? []) {
    if (item.product_type !== "mtg_sealed") continue; // store is sealed-only
    const product = await matchManapoolItem(item);
    if (!product) { await logIssue("manapool", order.id, `unmatched item ${item.product_id ?? ""} sku ${item.tcgsku ?? ""} x${item.quantity}`); continue; }
    const r = await recordSale({ source: "manapool", externalOrderId: order.id, productId: product.id, quantity: Number(item.quantity ?? 0) });
    if (!r.duplicate) recorded++;
  }
  if (recorded) revalidateCatalogCache();
  return NextResponse.json({ ok: true, recorded });
}
