// 12-hour sealed reconcile: plain script, no model, no writes. Produces a change list for approval.
// Usage: tsx scripts/sealed-reconcile.ts [--tcg-export path/to/TCGplayer__MyPricing.csv] [--out dir]
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { prisma } from "../lib/prisma";
import { listSealedInventory } from "../lib/sync/manapool";
import { diffSealed, tcgExportQuantities } from "../lib/sync/reconcile";

function arg(name: string) { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; }

async function main() {
  const store = await prisma.product.findMany({ where: { isActive: true }, select: { id: true, name: true, quantity: true, manapoolProductId: true, tcgplayerSku: true } });
  let mp: Map<string, number> | null = null;
  if (process.env.MANAPOOL_EMAIL && process.env.MANAPOOL_ACCESS_TOKEN) {
    mp = new Map((await listSealedInventory()).map((r) => [r.productId, r.quantity]));
  } else console.log("Mana Pool credentials not set: skipping Mana Pool side");
  const tcgPath = arg("--tcg-export");
  const tcg = tcgPath ? tcgExportQuantities(readFileSync(tcgPath, "utf8")) : null;
  if (!tcg) console.log("No TCGplayer export passed: skipping TCGplayer side");
  const rows = diffSealed(store, mp, tcg);
  const outDir = arg("--out") ?? "reconcile-out";
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const csv = ["product_id,name,channel,store_qty,channel_qty,proposed_action", ...rows.map((r) => [r.productId, `"${r.name.replace(/"/g, '""')}"`, r.channel, r.storeQty, r.channelQty ?? "", `"${r.action}"`].join(","))].join("\n") + "\n";
  writeFileSync(join(outDir, `sealed-change-list-${stamp}.csv`), csv);
  console.log(JSON.stringify({ products: store.length, manapoolChecked: !!mp, tcgplayerChecked: !!tcg, changes: rows.length }, null, 2));
  console.log("Change list only. Nothing was changed on any platform.");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
