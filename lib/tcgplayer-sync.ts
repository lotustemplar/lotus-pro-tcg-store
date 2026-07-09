import { prisma } from "./prisma";
import { buildTcgplayerImageUrl, fetchTcgplayerProductDetails } from "./tcgplayer";
import { applyTrackedTcgplayerPricing } from "./pricing";

function toCents(price: number | null | undefined) {
  return Math.max(0, Math.round((price ?? 0) * 100));
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
    },
  });

  let synced = 0;
  let failed = 0;
  let updatedPrices = 0;

  for (const product of trackedProducts) {
    if (!product.sourceProductId) continue;

    try {
      const details = await fetchTcgplayerProductDetails(product.sourceProductId);
      const sourcePriceCents = toCents(
        details.lowestPriceWithShipping ?? details.lowestPrice ?? details.marketPrice ?? 0
      );
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
          lastSyncError: null,
        },
      });

      synced += 1;
      if (product.autoUpdatePrice) updatedPrices += 1;
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
  };
}
