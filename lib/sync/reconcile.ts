// Pure diff logic for the 12-hour sealed reconcile. No writes anywhere.
export type StoreRow = { id: string; name: string; quantity: number; manapoolProductId: string | null; tcgplayerSku: number | null };
export type ChannelQty = Map<string, number>; // key -> qty
// Marketplaces (Mana Pool, TCGplayer) are the source of truth for sealed counts.
// The reconcile only ever proposes STORE changes; it never proposes marketplace writes.
export type ChangeRow = { productId: string; name: string; storeQty: number; manapoolQty: number | null; tcgplayerQty: number | null; proposedStoreQty: number | null; action: string };

export function diffSealed(store: StoreRow[], mp: ChannelQty | null, tcg: ChannelQty | null): ChangeRow[] {
  const out: ChangeRow[] = [];
  for (const p of store) {
    const m = mp && p.manapoolProductId ? mp.get(p.manapoolProductId) ?? 0 : null;
    const t = tcg && p.tcgplayerSku ? tcg.get(String(p.tcgplayerSku)) ?? 0 : null;
    if (m === null && t === null) continue;
    if (m !== null && t !== null && m !== t) {
      out.push({ productId: p.id, name: p.name, storeQty: p.quantity, manapoolQty: m, tcgplayerQty: t, proposedStoreQty: null, action: `FLAG: Mana Pool ${m} vs TCGplayer ${t}; decide manually` });
      continue;
    }
    const truth = (m ?? t) as number;
    if (truth !== p.quantity) out.push({ productId: p.id, name: p.name, storeQty: p.quantity, manapoolQty: m, tcgplayerQty: t, proposedStoreQty: truth, action: `set store qty ${p.quantity} -> ${truth}` });
  }
  return out;
}

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [h, ...rest] = rows.filter((r) => r.some(Boolean));
  return rest.map((r) => Object.fromEntries(h.map((k, i) => [k.trim(), (r[i] ?? "").trim()])));
}

/** TCGplayer pricing export -> SKU (TCGplayer Id) -> Total Quantity, sealed rows only. */
export function tcgExportQuantities(text: string): ChannelQty {
  const m = new Map<string, number>();
  for (const r of parseCsv(text)) {
    if (!/unopened/i.test(r["Condition"] || "")) continue;
    m.set(r["TCGplayer Id"], Number(r["Total Quantity"] || 0));
  }
  return m;
}
