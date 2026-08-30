import { prisma } from "@/lib/prisma";
import { classifyMysteryTier } from "@/lib/mystery-bags";
import { MysteryBagsWorkspace } from "./MysteryBagsWorkspace";

export const dynamic = "force-dynamic";

type HistoryBatch = { id: string; name: string; status: string; createdAt: Date; finalizedAt: Date | null; metricsJson: string };

export default async function MysteryBagsPage() {
  let inventory: Awaited<ReturnType<typeof prisma.mysteryPackInventory.findMany>> = [];
  let batches: HistoryBatch[] = [];
  let heroImageUrl: string | null = null;
  try {
    const [inventoryRows, batchRows, mysterySettings] = await Promise.all([
      prisma.mysteryPackInventory.findMany({ where: { quantity: { gt: 0 } }, orderBy: [{ tier: "asc" }, { name: "asc" }] }),
      prisma.mysteryBatch.findMany({ orderBy: { createdAt: "desc" }, take: 8, select: { id: true, name: true, status: true, createdAt: true, finalizedAt: true, metricsJson: true } }),
      prisma.mysteryBagSettings.findUnique({ where: { id: "mystery-bag" } }),
    ]);
    inventory = inventoryRows.map((pack) => ({ ...pack, tier: classifyMysteryTier(pack.marketValueCents) }));
    batches = batchRows;
    heroImageUrl = mysterySettings?.heroImageUrl ?? null;
  } catch {
    // The page remains useful while a local database is being migrated.
  }
  return <MysteryBagsWorkspace initialInventory={inventory} initialBatches={batches} initialHeroImageUrl={heroImageUrl} />;
}
