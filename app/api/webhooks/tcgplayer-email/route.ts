import { NextRequest, NextResponse } from "next/server";
import { verifyRelaySignature } from "@/lib/sync/signature";
import { parseTcgplayerSaleEmail } from "@/lib/sync/tcgplayer-email";
import { logIssue, matchTcgplayerName, recordSale } from "@/lib/sync/engine";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

export const dynamic = "force-dynamic";

// Called by the Google Apps Script relay (docs/tcgplayer-email-relay.md) with {messages:[{id, body}]}.
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyRelaySignature(raw, req.headers.get("x-lotus-timestamp"), req.headers.get("x-lotus-signature"), process.env.EMAIL_RELAY_SECRET)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }
  const { messages } = JSON.parse(raw) as { messages: { id: string; body: string }[] };
  const results: { id: string; order?: string; recorded: number; unmatched: number; parsed: boolean }[] = [];
  let any = false;
  for (const m of messages ?? []) {
    const sale = parseTcgplayerSaleEmail(m.body || "");
    if (!sale) { results.push({ id: m.id, recorded: 0, unmatched: 0, parsed: false }); continue; }
    let recorded = 0; let unmatched = 0;
    for (const line of sale.lines) {
      if (!/unopened|sealed/i.test(line.condition)) continue; // singles are not in the store
      const p = await matchTcgplayerName(line.name);
      if (!p) { unmatched++; await logIssue("tcgplayer", sale.order, `unmatched "${line.name}" x${line.qty}`); continue; }
      const r = await recordSale({ source: "tcgplayer", externalOrderId: sale.order, productId: p.id, quantity: line.qty });
      if (!r.duplicate) { recorded++; any = true; }
    }
    results.push({ id: m.id, order: sale.order, recorded, unmatched, parsed: true });
  }
  if (any) revalidateCatalogCache();
  return NextResponse.json({ ok: true, results });
}
