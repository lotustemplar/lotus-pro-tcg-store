import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../ProductForm";
import { getAllCategoriesWithParent, toAllOptions } from "@/lib/admin";

export const dynamic = "force-dynamic";

type ProductImage = { url: string; altText: string };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id: params.id },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    }),
    getAllCategoriesWithParent(),
  ]);

  if (!product) return notFound();

  const options = toAllOptions(categories);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-white">Edit Product</h1>
      <ProductForm
        categories={options}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          priceCents: product.priceCents,
          sourceMarketplace: product.sourceMarketplace,
          sourceUrl: product.sourceUrl,
          sourceProductId: product.sourceProductId,
          sourceProductLine: product.sourceProductLine,
          sourceSetName: product.sourceSetName,
          sourceProductType: product.sourceProductType,
          sourcePriceCents: product.sourcePriceCents,
          sourceImageUrl: product.sourceImageUrl,
          autoUpdatePrice: product.autoUpdatePrice,
          compareAtCents: product.compareAtCents,
          sku: product.sku,
          quantity: product.quantity,
          categoryId: product.categoryId,
          featuredOnHome: product.featuredOnHome,
          featuredOrder: product.featuredOrder,
          isActive: product.isActive,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          seoKeywords: product.seoKeywords,
          images: product.images.map((i: ProductImage) => ({ url: i.url, altText: i.altText })),
        }}
      />
    </div>
  );
}
