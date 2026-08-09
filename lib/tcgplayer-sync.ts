import { prisma } from "./prisma";
import { refreshTrackedTcgplayerSource } from "./tcgplayer";
import { applyTrackedTcgplayerPricing } from "./pricing";

export type TcgplayerSyncResult = {
  id: string;
  name: string;
  sourceSetName: string | null;
  sourceProductType: string | null;
  previousStorePriceCents: number;
  nextStorePriceCents: number;
  previousSourcePriceCents: number | null;
  nextSourcePriceCents: number | null;
  autoUpdatePrice: boolean;
  storefrontUpdated: boolean;
  sourceUpdated: boolean;
  warningMessage: string | null;
  errorMessage: string | null;
  lastSyncedAt: string;
};

export function isDatabaseQuotaExceededError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("exceeded the data transfer quota") ||
    normalized.includes("paused after reaching") ||
    normalized.includes("quota")
  );
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown sync error.";
}

function formatDollarsFromCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function syncTcgplayerProducts(productIds?: string[]) {
  const trackedProducts = await prisma.product.findMany({
    where: {
      sourceMarketplace: "tcgplayer",
      sourceProductId: { not: null },
      ...(productIds?.length ? { id: { in: productIds } } : {}),
    },
    select: {
      id: true,
      name: true,
      priceCents: true,
      compareAtCents: true,
      autoUpdatePrice: true,
      sourceUrl: true,
      sourceSetName: true,
      sourceProductType: true,
      sourceProductId: true,
      sourcePriceCents: true,
    },
  });

  let synced = 0;
  let failed = 0;
  let updatedPrices = 0;
  let warnings = 0;
  const warningProducts: string[] = [];
  const results: TcgplayerSyncResult[] = [];

  for (const product of trackedProducts) {
    if (!product.sourceProductId) continue;

    try {
      const snapshot = await refreshTrackedTcgplayerSource({
        sourceUrl: product.sourceUrl,
        sourceProductId: product.sourceProductId,
        previousSourcePriceCents: product.sourcePriceCents,
      });
      const sourcePriceCents = snapshot.sourcePriceCents;
      const pricing = applyTrackedTcgplayerPricing({
        autoUpdatePrice: product.autoUpdatePrice,
        priceCents: sourcePriceCents,
        sourcePriceCents,
      });
      const nowIso = new Date().toISOString();
      const requiresManualReview = !snapshot.autoUpdatePrice && snapshot.warningMessage?.startsWith("Price discrepancy detected");
      const manualReviewMessage = requiresManualReview
        ? `Price discrepancy detected for ${product.name} - manual review required. Live TCGplayer review price: ${formatDollarsFromCents(sourcePriceCents)}.`
        : snapshot.warningMessage;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          compareAtCents: requiresManualReview ? product.compareAtCents : pricing.compareAtCents,
          priceCents: requiresManualReview
            ? undefined
            : product.autoUpdatePrice
              ? pricing.priceCents
              : undefined,
          sourceUrl: snapshot.sourceUrl,
          sourceProductId: snapshot.sourceProductId,
          sourcePriceCents: requiresManualReview ? product.sourcePriceCents : sourcePriceCents,
          sourceImageUrl: snapshot.sourceImageUrl,
          sourceProductLine: snapshot.sourceProductLine?.trim() ?? null,
          sourceProductType: snapshot.sourceProductType?.trim() ?? null,
          sourceSetName: snapshot.sourceSetName?.trim() ?? null,
          lastSyncedAt: new Date(nowIso),
          lastSyncError: manualReviewMessage,
        },
      });

      synced += 1;
      if (!requiresManualReview && product.autoUpdatePrice) updatedPrices += 1;
      if (manualReviewMessage) {
        warnings += 1;
        warningProducts.push(product.name);
      }

      results.push({
        id: product.id,
        name: product.name,
        sourceSetName: snapshot.sourceSetName?.trim() ?? product.sourceSetName ?? null,
        sourceProductType: snapshot.sourceProductType?.trim() ?? product.sourceProductType ?? null,
        previousStorePriceCents: product.priceCents,
        nextStorePriceCents:
          requiresManualReview || !product.autoUpdatePrice ? product.priceCents : pricing.priceCents,
        previousSourcePriceCents: product.sourcePriceCents,
        nextSourcePriceCents: requiresManualReview ? product.sourcePriceCents : sourcePriceCents,
        autoUpdatePrice: product.autoUpdatePrice,
        storefrontUpdated:
          !requiresManualReview && product.autoUpdatePrice && product.priceCents !== pricing.priceCents,
        sourceUpdated: !requiresManualReview && product.sourcePriceCents !== sourcePriceCents,
        warningMessage: manualReviewMessage,
        errorMessage: null,
        lastSyncedAt: nowIso,
      });
    } catch (error) {
      failed += 1;
      const nowIso = new Date().toISOString();
      const errorMessage = toErrorMessage(error);
      await prisma.product.update({
        where: { id: product.id },
        data: {
          lastSyncedAt: new Date(nowIso),
          lastSyncError: errorMessage,
        },
      });
      results.push({
        id: product.id,
        name: product.name,
        sourceSetName: product.sourceSetName,
        sourceProductType: product.sourceProductType,
        previousStorePriceCents: product.priceCents,
        nextStorePriceCents: product.priceCents,
        previousSourcePriceCents: product.sourcePriceCents,
        nextSourcePriceCents: product.sourcePriceCents,
        autoUpdatePrice: product.autoUpdatePrice,
        storefrontUpdated: false,
        sourceUpdated: false,
        warningMessage: null,
        errorMessage,
        lastSyncedAt: nowIso,
      });
    }
  }

  return {
    failed,
    scanned: trackedProducts.length,
    results,
    synced,
    updatedPrices,
    warnings,
    warningProducts,
  };
}
