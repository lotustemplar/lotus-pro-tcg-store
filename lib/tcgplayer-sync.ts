import { prisma } from "./prisma";
import { buildTcgplayerImageUrl, fetchResolvedTcgplayerPricing } from "./tcgplayer";
import { applyTrackedTcgplayerPricing } from "./pricing";

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
      autoUpdatePrice: true,
      priceCents: true,
      compareAtCents: true,
      sourceProductId: true,
      sourcePriceCents: true,
    },
  });

  let synced = 0;
  let failed = 0;
  let updatedPrices = 0;
  let warnings = 0;
  const warningProducts: string[] = [];

  for (const product of trackedProducts) {
    if (!product.sourceProductId) continue;

    try {
      const { details, resolved } = await fetchResolvedTcgplayerPricing(
        product.sourceProductId,
        product.sourcePriceCents,
      );
      const sourcePriceCents = resolved.sourcePriceCents;
      const pricing = applyTrackedTcgplayerPricing({
        autoUpdatePrice: product.autoUpdatePrice,
        priceCents: sourcePriceCents,
        sourcePriceCents,
      });

      const manualReviewMessage = resolved.requiresManualReview
        ? `Price discrepancy detected for ${product.name} - manual review required. Live TCGplayer review price: ${formatDollarsFromCents(sourcePriceCents)}.`
        : resolved.warningMessage;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          compareAtCents: resolved.requiresManualReview ? product.compareAtCents : pricing.compareAtCents,
          priceCents: resolved.requiresManualReview
            ? undefined
            : product.autoUpdatePrice
              ? pricing.priceCents
              : undefined,
          sourcePriceCents: resolved.requiresManualReview ? product.sourcePriceCents : sourcePriceCents,
          sourceImageUrl: buildTcgplayerImageUrl(product.sourceProductId, 1000),
          sourceProductLine: details.productLineName?.trim() ?? null,
          sourceProductType: details.productTypeName?.trim() ?? null,
          sourceSetName: details.setName?.trim() ?? null,
          lastSyncedAt: new Date(),
          lastSyncError: manualReviewMessage,
        },
      });

      synced += 1;
      if (!resolved.requiresManualReview && product.autoUpdatePrice) updatedPrices += 1;
      if (manualReviewMessage) {
        warnings += 1;
        warningProducts.push(product.name);
      }
    } catch (error) {
      failed += 1;
      await prisma.product.update({
        where: { id: product.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncError: toErrorMessage(error),
        },
      });
    }
  }

  return {
    failed,
    scanned: trackedProducts.length,
    synced,
    updatedPrices,
    warnings,
    warningProducts,
  };
}
