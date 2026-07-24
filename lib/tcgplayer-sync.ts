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

export async function syncTcgplayerProducts(productIds?: string[]) {
  const trackedProducts = await prisma.product.findMany({
    where: {
      sourceMarketplace: "tcgplayer",
      sourceProductId: { not: null },
      ...(productIds?.length ? { id: { in: productIds } } : {}),
    },
    select: {
      id: true,
      autoUpdatePrice: true,
      sourceProductId: true,
      sourcePriceCents: true,
    },
  });

  let synced = 0;
  let failed = 0;
  let updatedPrices = 0;
  let warnings = 0;

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

      await prisma.product.update({
        where: { id: product.id },
        data: {
          compareAtCents: pricing.compareAtCents,
          priceCents: product.autoUpdatePrice ? pricing.priceCents : undefined,
          sourcePriceCents,
          sourceImageUrl: buildTcgplayerImageUrl(product.sourceProductId, 1000),
          sourceProductLine: details.productLineName?.trim() ?? null,
          sourceProductType: details.productTypeName?.trim() ?? null,
          sourceSetName: details.setName?.trim() ?? null,
          lastSyncedAt: new Date(),
          lastSyncError: resolved.warningMessage,
        },
      });

      synced += 1;
      if (product.autoUpdatePrice) updatedPrices += 1;
      if (resolved.warningMessage) warnings += 1;
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
  };
}
