import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { formatCents } from "@/lib/format";
import { AddToCartButton } from "@/components/AddToCartButton";
import { StockBadge } from "@/components/StockBadge";
import { RestockNotifyForm } from "@/components/RestockNotifyForm";
import type { Metadata } from "next";
import { buildSocialMetadata } from "@/lib/metadata";
import { getSiteSettings } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

type ProductImage = { id: string; url: string; altText: string };

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      category: { include: { parent: true } },
    },
  });
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const [product, settings] = await Promise.all([getProduct(params.slug), getSiteSettings()]);
  if (!product) return {};
  const title = product.seoTitle || product.name;
  const description = product.seoDescription || product.description.slice(0, 155);

  return {
    title,
    description,
    keywords: product.seoKeywords ?? undefined,
    ...buildSocialMetadata({
      title,
      description,
      path: `/product/${product.slug}`,
      image: product.images[0]?.url ?? null,
      siteName: settings.brandName,
    }),
  };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product || !product.isActive) return notFound();

  const mainImage = product.images[0]?.url ?? null;

  return (
    <div className="space-y-10">
      <div className="grid gap-10 lg:grid-cols-2">
        {/* Image gallery */}
        <div className="space-y-3">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-bg-panel">
            {mainImage ? (
              <Image src={mainImage} alt={product.name} fill className="object-cover" priority />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">No Image</div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2">
              {product.images.slice(1, 6).map((img: ProductImage) => (
                <div key={img.id} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border bg-bg-panel">
                  <Image src={img.url} alt={img.altText || product.name} fill className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Above-the-fold buy box */}
        <div className="space-y-5">
          {product.category?.parent && (
            <p className="text-xs uppercase tracking-wide text-brand-400">
              {product.category.parent.name} / {product.category.name}
            </p>
          )}
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">{product.name}</h1>
          <div className="flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold text-brand-300">
              {formatCents(product.priceCents)}
            </span>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <span className="text-lg text-gray-500 line-through">
                {formatCents(product.compareAtCents)}
              </span>
            )}
          </div>

          {/* Add to cart — above the fold, per spec */}
          <AddToCartButton
            productId={product.id}
            slug={product.slug}
            name={product.name}
            priceCents={product.priceCents}
            image={mainImage}
            quantityAvailable={product.quantity}
          />

          {product.quantity <= 0 && <RestockNotifyForm productId={product.id} />}

          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-300">
            {product.description}
          </p>

          {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
        </div>
      </div>

      {/* Flaming low-stock badge — bottom of page, per spec */}
      <StockBadge quantity={product.quantity} />
    </div>
  );
}
