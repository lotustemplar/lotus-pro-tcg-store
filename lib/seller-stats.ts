import fallback from "@/data/seller-stats.json";

/** Marketplace seller stats for the storefront trust strip.
 *  Fetched server-side and cached for a week (Next fetch revalidate).
 *  Any failure or implausible value falls back to data/seller-stats.json. */
export const SELLER_STATS_REVALIDATE_SECONDS = 604800;

export type SellerStats = {
  manapool: { url: string; averageRating: number; ratings365d: number; salesAllTime: number };
  tcgplayer: { url: string; ratingPercent: number; sales: string };
};

const UA = "Mozilla/5.0 (compatible; LotusProTCG-store/1.0; +https://lotusprotcg.com)";
const positive = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n > 0;

async function fetchManaPool(): Promise<SellerStats["manapool"] | null> {
  try {
    const res = await fetch(`${fallback.manapool.url}/profile`, {
      headers: { "User-Agent": UA },
      next: { revalidate: SELLER_STATS_REVALIDATE_SECONDS, tags: ["seller-stats"] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Profile page embeds one stats object per window; take the 365-day one.
    const block = html.match(/\{[^{}]*interval_days:365[^{}]*\}/)?.[0];
    if (!block) return null;
    const num = (key: string) => {
      const m = block.match(new RegExp(`${key}:([0-9.]+)`));
      return m ? Number(m[1]) : NaN;
    };
    const parts = ["average_speed", "average_grading", "average_accuracy", "average_packaging"].map(num);
    const averageRating = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100) / 100;
    const ratings365d = num("ratings");
    const salesAllTime = num("all_time_sales_confirmed");
    if (!parts.every(positive) || averageRating > 5 || !positive(ratings365d) || !positive(salesAllTime)) return null;
    return { url: fallback.manapool.url, averageRating, ratings365d, salesAllTime };
  } catch {
    return null;
  }
}

async function fetchTcgplayer(): Promise<SellerStats["tcgplayer"] | null> {
  try {
    const res = await fetch("https://mpapi.tcgplayer.com/v2/seller/info", {
      method: "POST",
      headers: { "User-Agent": UA, "Content-Type": "application/json" },
      body: JSON.stringify(["25bd25a8"]),
      next: { revalidate: SELLER_STATS_REVALIDATE_SECONDS, tags: ["seller-stats"] },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { results?: { rating?: number; completedSalesRank?: string }[] };
    const r = json.results?.[0];
    const ratingPercent = r?.rating;
    const sales = (r?.completedSalesRank ?? "").trim();
    if (!positive(ratingPercent) || ratingPercent > 100 || !/^[0-9][0-9,]*\+?$/.test(sales)) return null;
    return { url: fallback.tcgplayer.url, ratingPercent, sales };
  } catch {
    return null;
  }
}

export async function getSellerStats(): Promise<SellerStats> {
  const [manapool, tcgplayer] = await Promise.all([fetchManaPool(), fetchTcgplayer()]);
  return {
    manapool: manapool ?? fallback.manapool,
    tcgplayer: tcgplayer ?? fallback.tcgplayer,
  };
}
