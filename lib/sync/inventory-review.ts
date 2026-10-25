// "SYNC INVENTORIES" review: marketplaces (Mana Pool, TCGplayer) are the real counts.
// The store copies FROM them. Nothing here ever writes to a marketplace.
// Matching mirrors the 2026-10-24 seed (seed_build.py):
//   Mana Pool  -> store: manapoolProductId, else Mana Pool tcgplayer_id == store sourceProductId
//   TCGplayer  -> store: TCGplayer Id (SKU) == store tcgplayerSku, else Mana Pool's tcgplayer_sku, else exact name
//   missing or 0 on one marketplace -> use the other's count; FLAG only when both are positive and differ
import { parseCsv } from "./reconcile";

export type StoreItem = { id: string; name: string; sourceSetName: string | null; quantity: number; isActive: boolean; sourceProductId: number | null; manapoolProductId: string | null; tcgplayerSku: number | null };
export type MpItem = { productId: string; tcgsku: number | null; tcgplayerId: number | null; quantity: number; name: string };
export type TcgItem = { sku: number; name: string; productLine: string; setName: string; quantity: number };

export type ReviewRow = {
  productId: string | null; // null => not in store
  name: string;
  storeQty: number | null;
  manapoolQty: number | null;
  tcgplayerQty: number | null;
  proposedQty: number | null;
  change: number | null;
  status: "change" | "same" | "flag" | "no listing" | "not in store";
  note: string;
  manapoolProductId?: string | null;
  tcgplayerSku?: number | null;
};

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function parseTcgplayerExport(text: string): TcgItem[] {
  return parseCsv(text)
    .filter((r) => /^unopened/i.test(r["Condition"] || ""))
    .map((r) => ({ sku: Number(r["TCGplayer Id"]), name: r["Product Name"], productLine: r["Product Line"], setName: r["Set Name"], quantity: Number(r["Total Quantity"] || 0) }))
    .filter((r) => Number.isFinite(r.sku))
    .filter((r) => r.quantity > 0);
}

// Filipe: TCGplayer rows at quantity 0 are meaningless, so they are dropped. A product missing from the
// TCGplayer data is treated exactly like one at 0 there (falls back to Mana Pool's count).
export function dropZeroTcgRows(rows: TcgItem[] | null): TcgItem[] | null {
  return rows ? rows.filter((r) => Number(r.quantity) > 0) : rows;
}

export function buildInventoryReview(store: StoreItem[], mp: MpItem[] | null, tcg: TcgItem[] | null): ReviewRow[] {
  tcg = dropZeroTcgRows(tcg);
  const rows: ReviewRow[] = [];
  const usedMp = new Set<string>(); const usedTc = new Set<number>();
  const mpById = new Map((mp ?? []).map((m) => [m.productId, m]));
  const mpByTid = new Map<number, MpItem[]>();
  for (const m of mp ?? []) if (m.tcgplayerId) mpByTid.set(m.tcgplayerId, [...(mpByTid.get(m.tcgplayerId) ?? []), m]);
  const tcBySku = new Map((tcg ?? []).map((t) => [t.sku, t]));

  for (const p of store) {
    let m: MpItem | undefined = p.manapoolProductId ? mpById.get(p.manapoolProductId) : undefined;
    if (!m && p.sourceProductId) { const c = mpByTid.get(p.sourceProductId); if (c?.length === 1) m = c[0]; }
    let t: TcgItem | undefined = p.tcgplayerSku ? tcBySku.get(p.tcgplayerSku) : undefined;
    if (!t && m?.tcgsku) t = tcBySku.get(m.tcgsku);
    if (!t && tcg) { const c = tcg.filter((x) => norm(x.name) && (norm(x.name) === norm(p.name) || norm(x.name) === norm(`${p.sourceSetName ?? ""} ${p.name}`))); if (c.length === 1) t = c[0]; }
    if (m) usedMp.add(m.productId); if (t) usedTc.add(t.sku);
    // A product linked to a marketplace listing that no longer exists there counts as 0 on that channel.
    let mq: number | null = m ? m.quantity : mp && p.manapoolProductId ? 0 : null;
    // Like the seed: a SKU missing from the TCGplayer export means "not listed there" (no count), not 0.
    let tq: number | null = t ? t.quantity : null;
    const base = { productId: p.id, name: p.sourceSetName && !p.name.includes(p.sourceSetName) ? `${p.sourceSetName} — ${p.name}` : p.name, storeQty: p.quantity, manapoolQty: mq, tcgplayerQty: tq, manapoolProductId: m?.productId ?? p.manapoolProductId, tcgplayerSku: t?.sku ?? p.tcgplayerSku };
    let proposed: number | null; let note: string;
    // Filipe's rule: many sealed items are listed on only one marketplace on purpose.
    // Missing OR 0 on one channel -> use the other channel's count. Flag only when both are positive and differ.
    if (mq !== null && tq !== null && mq > 0 && tq > 0) { if (mq === tq) { proposed = mq; note = "Mana Pool and TCGplayer agree"; } else { proposed = null; note = `Mana Pool ${mq} vs TCGplayer ${tq}: pick one`; } }
    else if (mq !== null && tq !== null) { proposed = Math.max(mq, tq); note = mq === tq ? "0 on both marketplaces" : mq > tq ? "Mana Pool (0 on TCGplayer)" : "TCGplayer (0 on Mana Pool)"; }
    else if (mq !== null) { proposed = mq; note = tcg ? "Mana Pool only (not on TCGplayer)" : "Mana Pool (no TCGplayer export loaded)"; }
    else if (tq !== null) { proposed = tq; note = "TCGplayer only"; }
    else { rows.push({ ...base, proposedQty: null, change: null, status: "no listing", note: "Not listed on Mana Pool or TCGplayer; store count unverified" }); continue; }
    if (!p.isActive) note += " [inactive in store]";
    if (proposed === null) rows.push({ ...base, proposedQty: null, change: null, status: "flag", note });
    else rows.push({ ...base, proposedQty: proposed, change: proposed - p.quantity, status: proposed === p.quantity ? "same" : "change", note });
  }
  for (const m of mp ?? []) {
    if (usedMp.has(m.productId) || m.quantity <= 0) continue;
    const t = m.tcgsku ? tcBySku.get(m.tcgsku) : undefined; if (t) usedTc.add(t.sku);
    rows.push({ productId: null, name: m.name, storeQty: null, manapoolQty: m.quantity, tcgplayerQty: t?.quantity ?? null, proposedQty: null, change: null, status: "not in store", note: "On Mana Pool, not in store", manapoolProductId: m.productId, tcgplayerSku: m.tcgsku });
  }
  for (const t of tcg ?? []) {
    if (usedTc.has(t.sku) || t.quantity <= 0) continue;
    rows.push({ productId: null, name: `${t.setName} — ${t.name}`, storeQty: null, manapoolQty: null, tcgplayerQty: t.quantity, proposedQty: null, change: null, status: "not in store", note: `On TCGplayer (${t.productLine}), not in store`, tcgplayerSku: t.sku });
  }
  // Hide rows that are 0 everywhere (store, TCGplayer, Mana Pool): nothing to review.
  const visible = rows.filter((r) => !((r.storeQty ?? 0) === 0 && (r.manapoolQty ?? 0) === 0 && (r.tcgplayerQty ?? 0) === 0));
  const order = { change: 0, flag: 1, "not in store": 2, "no listing": 3, same: 4 } as const;
  return visible.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name));
}
