import type { Prisma } from "@prisma/client";

export const EXCLUSIVE_SALE_FEATURED_ORDER = -1;

export function isExclusiveSaleFeaturedOrder(order: number | null | undefined) {
  return order === EXCLUSIVE_SALE_FEATURED_ORDER;
}

export function normalizeFeaturedPlacement<T extends { featuredOnHome: boolean; featuredOrder: number }>(
  placement: T,
): T {
  if (isExclusiveSaleFeaturedOrder(placement.featuredOrder)) {
    return {
      ...placement,
      featuredOnHome: true,
      featuredOrder: EXCLUSIVE_SALE_FEATURED_ORDER,
    };
  }

  if (!placement.featuredOnHome) {
    return {
      ...placement,
      featuredOrder: 0,
    };
  }

  return {
    ...placement,
    featuredOrder: Math.max(0, placement.featuredOrder),
  };
}

export async function clearOtherExclusiveSaleProducts(tx: Prisma.TransactionClient, currentProductId: string) {
  await tx.product.updateMany({
    where: {
      featuredOrder: EXCLUSIVE_SALE_FEATURED_ORDER,
      NOT: { id: currentProductId },
    },
    data: {
      featuredOnHome: true,
      featuredOrder: 0,
    },
  });
}
