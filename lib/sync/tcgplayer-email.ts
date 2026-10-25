// Parse TCGplayer "Your TCGplayer.com items of ... have sold!" emails. Pure code, no model.
export type TcgSaleLine = { qty: number; name: string; condition: string };
export type TcgSale = { order: string; direct: boolean; lines: TcgSaleLine[] };

export function parseTcgplayerSaleEmail(body: string): TcgSale | null {
  const text = body.replace(/\r/g, "");
  const orderMatch = text.match(/Order:\s*([0-9A-F]{8}-[0-9A-F]{6}-[0-9A-F]{5})/i);
  if (!orderMatch) return null;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const start = lines.findIndex((l) => /^ORDER DETAILS/i.test(l));
  const end = lines.findIndex((l, i) => i > start && /^(Remember to ship|Thanks,|Confirm)/i.test(l));
  const region = lines.slice(start >= 0 ? start : 0, end > 0 ? end : lines.length);
  const out: TcgSaleLine[] = [];
  for (let i = 0; i < region.length - 1; i++) {
    const q = region[i];
    if (!/^\d{1,4}$/.test(q)) continue;
    const next = region[i + 1];
    const slash = next.lastIndexOf("/");
    if (slash <= 0) continue;
    out.push({ qty: Number(q), name: next.slice(0, slash).trim(), condition: next.slice(slash + 1).trim() });
    i++;
  }
  if (out.length === 0) return null;
  return { order: orderMatch[1].toUpperCase(), direct: /shipped by TCGplayer Direct/i.test(text), lines: out };
}

export function normalizeName(s: string) {
  return s.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
