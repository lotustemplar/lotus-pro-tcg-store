import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { planDailyPriceSync } from "@/lib/daily-price-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Vercel Cron (vercel.json) calls this once a day with "Authorization: Bearer $CRON_SECRET".
// Writes are only performed when PRICE_SYNC_ENABLED=true; otherwise it is a dry run.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const write = process.env.PRICE_SYNC_ENABLED === "true";
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, priceCents: true, sourceProductId: true, sourceProductLine: true, sourceSetName: true, tcgplayerGroupId: true, autoUpdatePrice: true },
  });
  const rows = await planDailyPriceSync(products);
  const now = new Date();
  let written = 0;
  if (write) {
    for (const r of rows) {
      const p = products.find((x) => x.id === r.id)!;
      const data: Record<string, unknown> = {};
      if (r.groupId && r.groupId !== p.tcgplayerGroupId) data.tcgplayerGroupId = r.groupId;
      if (r.marketCents != null) {
        data.sourcePriceCents = r.marketCents;
        data.compareAtCents = r.marketCents > r.newCents ? r.marketCents : null; // strike-through = TCGplayer market
        data.lastSyncedAt = now;
        data.lastSyncError = null;
        if (r.newCents !== r.currentCents) data.priceCents = r.newCents;
      } else if (r.status === "unmatched" || r.status === "no market price") {
        data.lastSyncError = `price sync: ${r.status}${r.note ? ` (${r.note})` : ""}`;
      }
      if (Object.keys(data).length) { await prisma.product.update({ where: { id: r.id }, data }); written++; }
    }
  }
  const count = (s: string) => rows.filter((r) => r.status === s).length;
  const summary = { mode: write ? "write" : "dry-run", total: rows.length, up: count("up"), down: count("down"), same: count("same"), skipped: count("skipped (auto-price off)"), noMarket: count("no market price"), unmatched: rows.filter((r) => r.status === "unmatched").map((r) => ({ id: r.id, name: r.name, note: r.note })), written };
  console.log("[price-sync]", JSON.stringify(summary));
  return NextResponse.json({ summary, rows });
}
