import { PrismaClient } from "@prisma/client";
import { getDiscountedStorePriceCents } from "@/lib/pricing";

async function main() {
  const prisma = new PrismaClient();

  try {
    const products = await prisma.product.findMany({
      where: {
        autoUpdatePrice: true,
        sourcePriceCents: { not: null },
      },
      select: {
        id: true,
        name: true,
        priceCents: true,
        sourcePriceCents: true,
      },
    });

    let updated = 0;

    for (const product of products) {
      const sourcePriceCents = product.sourcePriceCents ?? 0;
      const nextPriceCents = getDiscountedStorePriceCents(sourcePriceCents);

      if (product.priceCents === nextPriceCents) {
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: {
          priceCents: nextPriceCents,
          compareAtCents: sourcePriceCents,
        },
      });
      updated += 1;
    }

    console.log(JSON.stringify({ scanned: products.length, updated }));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
