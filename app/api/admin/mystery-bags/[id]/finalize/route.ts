import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { classifyMysteryTier, protectedMinBagValueCents } from "@/lib/mystery-bags";

const requestSchema = z.object({ action: z.literal("finalize") });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!requestSchema.safeParse(await req.json().catch(() => null)).success) return NextResponse.json({ error: "Explicit finalization is required." }, { status: 400 });
  try {
    const batch = await prisma.$transaction(async (tx) => {
      const current = await tx.mysteryBatch.findUnique({ where: { id: params.id }, include: { bags: { include: { assignments: true } } } });
      if (!current) throw new Error("Batch not found.");
      if (current.status !== "draft") throw new Error("This batch is already locked and cannot be finalized again.");
      const rules = JSON.parse(current.ruleSetJson) as { minBatchMarginPercent?: number; basicOnlyBagCount?: number; premiumBagCount?: number; ultraPremiumBagCount?: number; minPacksPerBag?: number; maxPacksPerBag?: number; minBagValueCents?: number; marketValueBufferPercent?: number; allowDuplicatePacks?: boolean; allowDuplicateSets?: boolean };
      const metrics = JSON.parse(current.metricsJson) as { totalReplacementCostProfitCents?: number; marginPercent?: number };
      if (typeof rules.minBatchMarginPercent !== "number" || typeof rules.basicOnlyBagCount !== "number" || typeof rules.premiumBagCount !== "number" || typeof rules.ultraPremiumBagCount !== "number") throw new Error("This draft uses an outdated rule set. Regenerate it before finalizing.");
      if (typeof metrics.totalReplacementCostProfitCents !== "number" || typeof metrics.marginPercent !== "number" || metrics.totalReplacementCostProfitCents <= 0 || metrics.marginPercent < rules.minBatchMarginPercent) throw new Error(`Finalization blocked: replacement-cost margin must be at least ${rules.minBatchMarginPercent}% and replacement-cost profit must be greater than $0.00.`);
      const outcomeCounts = current.bags.reduce((counts, bag) => { counts[bag.outcome] = (counts[bag.outcome] ?? 0) + 1; return counts; }, {} as Record<string, number>);
      if (outcomeCounts["Basic-only"] !== rules.basicOnlyBagCount || outcomeCounts.Premium !== rules.premiumBagCount || outcomeCounts["Ultra Premium"] !== rules.ultraPremiumBagCount) throw new Error("Finalization blocked: exact Basic-only, Premium, and Ultra Premium counts do not match the saved rules.");
      for (const bag of current.bags) {
        const packCount = bag.assignments.reduce((sum, assignment) => sum + assignment.quantity, 0);
        const marketValue = bag.assignments.reduce((sum, assignment) => sum + assignment.quantity * assignment.marketValueCents, 0);
        if (packCount < (rules.minPacksPerBag ?? 3) || packCount > (rules.maxPacksPerBag ?? 6)) throw new Error(`Finalization blocked: bag ${bag.bagNumber} does not contain the required number of packs.`);
        if (marketValue < protectedMinBagValueCents({ minBagValueCents: rules.minBagValueCents ?? 2500, marketValueBufferPercent: rules.marketValueBufferPercent ?? 0 })) throw new Error(`Finalization blocked: bag ${bag.bagNumber} is below the protected TCGplayer Market Value floor.`);
        if (!bag.assignments.some((assignment) => classifyMysteryTier(assignment.marketValueCents) === "Basic")) throw new Error(`Finalization blocked: bag ${bag.bagNumber} does not contain a Basic pack.`);
        if (!rules.allowDuplicatePacks && new Set(bag.assignments.map((assignment) => assignment.inventoryId)).size !== packCount) throw new Error(`Finalization blocked: bag ${bag.bagNumber} contains a duplicate pack.`);
        if (!rules.allowDuplicateSets && new Set(bag.assignments.map((assignment) => assignment.setNameSnapshot)).size !== packCount) throw new Error(`Finalization blocked: bag ${bag.bagNumber} contains a duplicate set.`);
      }
      const quantities = new Map<string, number>();
      for (const bag of current.bags) for (const assignment of bag.assignments) quantities.set(assignment.inventoryId, (quantities.get(assignment.inventoryId) ?? 0) + assignment.quantity);
      for (const [inventoryId, quantity] of quantities) {
        const updated = await tx.mysteryPackInventory.updateMany({ where: { id: inventoryId, quantity: { gte: quantity } }, data: { quantity: { decrement: quantity } } });
        if (updated.count !== 1) throw new Error("Inventory changed while this batch was being reviewed. Regenerate before finalizing.");
      }
      return tx.mysteryBatch.update({ where: { id: params.id }, data: { status: "finalized", finalizedAt: new Date() }, include: { bags: { orderBy: { bagNumber: "asc" } } } });
    });
    return NextResponse.json({ ok: true, batch });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Finalization failed." }, { status: 400 });
  }
}
