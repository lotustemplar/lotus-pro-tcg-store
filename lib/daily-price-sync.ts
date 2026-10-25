// Daily TCGplayer market price sync (no AI, plain code).
// Rule: store price = TCGplayer Market x 0.95, rounded UP to the next .97.
// Source: tcgcsv.com (free daily dump of TCGplayer prices), matched by TCGplayer productId.

export const TCGCSV = "https://tcgcsv.com/tcgplayer";
export const MARKET_MULTIPLIER = 0.95;

const CATEGORY_BY_LINE: Record<string, number> = {
  "magic: the gathering": 1,
  magic: 1,
  pokemon: 3,
  "weiss schwarz": 20,
  "one piece card game": 68,
};

export function categoryIdForLine(line: string | null | undefined): number | null {
  if (!line) return null;
  return CATEGORY_BY_LINE[line.trim().toLowerCase()] ?? null;
}

/** Round cents UP to the next x.97 (x.97 itself stays). */
export function roundUpTo97Cents(cents: number): number {
  const c = Math.max(0, Math.ceil(cents));
  const candidate = Math.floor(c / 100) * 100 + 97;
  return candidate >= c ? candidate : candidate + 100;
}

export function storePriceFromMarketCents(marketCents: number): number {
  return roundUpTo97Cents(Math.round(marketCents * MARKET_MULTIPLIER * 100) / 100);
}

type Group = { groupId: number; name: string; abbreviation?: string | null };

async function getJson(url: string) {
  const res = await fetch(url, { cache: "no-store", headers: { "user-agent": "lotusprotcg-price-sync" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type SyncInput = {
  id: string;
  name: string;
  priceCents: number;
  sourceProductId: number | null;
  sourceProductLine: string | null;
  sourceSetName: string | null;
  tcgplayerGroupId: number | null;
  autoUpdatePrice: boolean;
};

export type SyncRow = {
  id: string;
  name: string;
  currentCents: number;
  marketCents: number | null;
  newCents: number;
  groupId: number | null;
  status: "up" | "down" | "same" | "skipped (auto-price off)" | "unmatched" | "no market price";
  note: string;
};

/** Pure-read: computes the plan. Fetches only tcgcsv. Writes nothing. */
export async function planDailyPriceSync(products: SyncInput[]): Promise<SyncRow[]> {
  const groupsCache = new Map<number, Group[]>();
  const pricesCache = new Map<string, Map<number, number | null>>();
  const productIdsCache = new Map<string, Set<number>>();
  const groups = async (cat: number) => {
    if (!groupsCache.has(cat)) groupsCache.set(cat, (await getJson(`${TCGCSV}/${cat}/groups`)).results ?? []);
    return groupsCache.get(cat)!;
  };
  const groupProducts = async (cat: number, g: number) => {
    const k = `${cat}/${g}`;
    if (!productIdsCache.has(k))
      productIdsCache.set(k, new Set(((await getJson(`${TCGCSV}/${k}/products`)).results ?? []).map((p: any) => p.productId)));
    return productIdsCache.get(k)!;
  };
  const prices = async (cat: number, g: number) => {
    const k = `${cat}/${g}`;
    if (!pricesCache.has(k)) {
      const m = new Map<number, number | null>();
      for (const r of (await getJson(`${TCGCSV}/${k}/prices`)).results ?? []) {
        const v = r.marketPrice ?? null; // sealed: subTypeName "Normal"
        if (!m.has(r.productId) || (m.get(r.productId) == null && v != null)) m.set(r.productId, v);
      }
      pricesCache.set(k, m);
    }
    return pricesCache.get(k)!;
  };

  const rows: SyncRow[] = [];
  for (const p of products) {
    const base = { id: p.id, name: p.name, currentCents: p.priceCents, marketCents: null as number | null, newCents: p.priceCents, groupId: p.tcgplayerGroupId };
    if (!p.autoUpdatePrice) { rows.push({ ...base, status: "skipped (auto-price off)", note: "" }); continue; }
    const cat = categoryIdForLine(p.sourceProductLine);
    if (!p.sourceProductId || !cat) {
      rows.push({ ...base, status: "unmatched", note: !p.sourceProductId ? "no TCGplayer product id" : `unsupported product line: ${p.sourceProductLine}` });
      continue;
    }
    try {
      let gid = p.tcgplayerGroupId;
      if (!gid) {
        const gs = await groups(cat);
        const set = norm(p.sourceSetName ?? "");
        const candidates = gs.filter((g) => set && (norm(g.name) === set || norm(g.abbreviation ?? "") === set || norm(g.name).includes(set) || set.includes(norm(g.name))));
        for (const g of candidates) if ((await groupProducts(cat, g.groupId)).has(p.sourceProductId)) { gid = g.groupId; break; }
      }
      if (!gid) { rows.push({ ...base, status: "unmatched", note: `no tcgcsv group found for set "${p.sourceSetName}"` }); continue; }
      const mp = (await prices(cat, gid)).get(p.sourceProductId);
      if (mp == null) { rows.push({ ...base, groupId: gid, status: "no market price", note: "kept current price" }); continue; }
      const marketCents = Math.round(mp * 100);
      const newCents = storePriceFromMarketCents(marketCents);
      rows.push({ ...base, groupId: gid, marketCents, newCents, status: newCents > p.priceCents ? "up" : newCents < p.priceCents ? "down" : "same", note: "" });
    } catch (e) {
      rows.push({ ...base, status: "unmatched", note: `fetch error: ${e instanceof Error ? e.message : String(e)}` });
    }
  }
  return rows;
}
