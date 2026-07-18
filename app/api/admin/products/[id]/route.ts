import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { applyTrackedTcgplayerPricing } from "@/lib/pricing";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import { getCategoryUrl, getHomepageUrl, getProductUrl, submitIndexNowUrls } from "@/lib/indexnow";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().default(""),
  priceCents: z.number().int().min(0),
  sourceMarketplace: z.string().nullable().optional(),
  sourceUrl: z.string().nullable().optional(),
  sourceProductId: z.number().int().min(1).nullable().optional(),
  sourceProductLine: z.string().nullable().optional(),
  sourceSetName: z.string().nullable().optional(),
  sourceProductType: z.string().nullable().optional(),
  sourcePriceCents: z.number().int().min(0).nullable().optional(),
  sourceImageUrl: z.string().nullable().optional(),
  autoUpdatePrice: z.boolean().default(false),
  compareAtCents: z.number().int().min(0).nullable().optional(),
  sku: z.string().nullable().optional(),
  quantity: z.number().int().min(0),
  categoryId: z.string().min(1),
  featuredOnHome: z.boolean().default(false),
  featuredOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  seoKeywords: z.string().nullable().optional(),
  images: z.array(z.object({ url: z.string().min(1), altText: z.string().default("") })).default([]),
});

function emptyStringToNull(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeProductInput(data: z.infer<typeof productSchema>) {
  const normalized = {
    ...data,
    sourceMarketplace: emptyStringToNull(data.sourceMarketplace),
    sourceUrl: emptyStringToNull(data.sourceUrl),
    sourceProductLine: emptyStringToNull(data.sourceProductLine),
    sourceSetName: emptyStringToNull(data.sourceSetName),
    sourceProductType: emptyStringToNull(data.sourceProductType),
    sourceImageUrl: emptyStringToNull(data.sourceImageUrl),
    sku: emptyStringToNull(data.sku),
    seoTitle: emptyStringToNull(data.seoTitle),
    seoDescription: emptyStringToNull(data.seoDescription),
    seoKeywords: emptyStringToNull(data.seoKeywords),
  };

  if (normalized.sourceMarketplace === "tcgplayer") {
    const pricing = applyTrackedTcgplayerPricing({
      autoUpdatePrice: normalized.autoUpdatePrice,
      priceCents: normalized.priceCents,
      sourcePriceCents: normalized.sourcePriceCents,
    });

    return {
      ...normalized,
      compareAtCents: pricing.compareAtCents,
      priceCents: pricing.priceCents,
    };
  }

  return normalized;
}

function toAdminProductPayload(product: {
  id: string;
  name: string;
  priceCents: number;
  sourceMarketplace: string | null;
  sourceSetName: string | null;
  sourceProductType: string | null;
  sourcePriceCents: number | null;
  autoUpdatePrice: boolean;
  lastSyncedAt: Date | null;
  lastSyncError: string | null;
  quantity: number;
  featuredOnHome: boolean;
  isActive: boolean;
  categoryId: string;
}) {
  return {
    id: product.id,
    name: product.name,
    priceCents: product.priceCents,
    sourceMarketplace: product.sourceMarketplace,
    sourceSetName: product.sourceSetName,
    sourceProductType: product.sourceProductType,
    sourcePriceCents: product.sourcePriceCents,
    autoUpdatePrice: product.autoUpdatePrice,
    lastSyncedAt: product.lastSyncedAt?.toISOString() ?? null,
    lastSyncError: product.lastSyncError,
    quantity: product.quantity,
    featuredOnHome: product.featuredOnHome,
    isActive: product.isActive,
    categoryId: product.categoryId,
  };
}

const inlineProductSchema = z
  .object({
    name: z.string().min(1).optional(),
    priceCents: z.number().int().min(0).optional(),
    autoUpdatePrice: z.boolean().optional(),
    quantity: z.number().int().min(0).optional(),
    categoryId: z.string().min(1).optional(),
    featuredOnHome: z.boolean().optional(),
    featuredOrder: z.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required.",
  });

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalized = normalizeProductInput(parsed.data);
  const { images, ...data } = normalized;
  const previous = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      slug: true,
      category: {
        select: {
          slug: true,
          parent: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!previous) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  const dupe = await prisma.product.findFirst({
    where: { slug: data.slug, NOT: { id: params.id } },
  });
  if (dupe) {
    return NextResponse.json({ error: "Another product already uses that slug." }, { status: 400 });
  }

  try {
    const [, updatedProduct] = await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: params.id } }),
      prisma.product.update({
        where: { id: params.id },
        data: {
          ...data,
          images: { create: images.map((img, idx) => ({ ...img, sortOrder: idx })) },
        },
        select: {
          slug: true,
          category: {
            select: {
              slug: true,
              parent: {
                select: {
                  slug: true,
                },
              },
            },
          },
        },
      }),
    ]);
    revalidateCatalogCache();
    await submitIndexNowUrls([
      getHomepageUrl(),
      getProductUrl(previous.slug),
      getProductUrl(updatedProduct.slug),
      getCategoryUrl(previous.category),
      getCategoryUrl(updatedProduct.category),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "a unique field";
      return NextResponse.json({ error: `A product already uses ${target}.` }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Choose a valid category before saving this product." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update product." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = inlineProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      slug: true,
      autoUpdatePrice: true,
      priceCents: true,
      sourceMarketplace: true,
      sourcePriceCents: true,
      category: {
        select: {
          slug: true,
          parent: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }

  let patchData: Record<string, unknown> = parsed.data;

  if (existing.sourceMarketplace === "tcgplayer") {
    const hasExplicitPriceOverride = typeof parsed.data.priceCents === "number";
    const nextAutoUpdatePrice =
      parsed.data.autoUpdatePrice ?? (hasExplicitPriceOverride ? false : existing.autoUpdatePrice);
    const nextPriceCents = parsed.data.priceCents ?? existing.priceCents;
    const pricing = applyTrackedTcgplayerPricing({
      autoUpdatePrice: nextAutoUpdatePrice,
      priceCents: nextPriceCents,
      sourcePriceCents: existing.sourcePriceCents,
    });

    patchData = {
      ...parsed.data,
      autoUpdatePrice: nextAutoUpdatePrice,
      compareAtCents: pricing.compareAtCents,
      ...(nextAutoUpdatePrice ? { priceCents: pricing.priceCents } : {}),
    };
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: patchData,
    select: {
      id: true,
      name: true,
      slug: true,
      priceCents: true,
      sourceMarketplace: true,
      sourceSetName: true,
      sourceProductType: true,
      sourcePriceCents: true,
      autoUpdatePrice: true,
      lastSyncedAt: true,
      lastSyncError: true,
      quantity: true,
      featuredOnHome: true,
      isActive: true,
      categoryId: true,
      category: {
        select: {
          slug: true,
          parent: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });
  revalidateCatalogCache();
  await submitIndexNowUrls([
    getHomepageUrl(),
    getProductUrl(existing.slug),
    getProductUrl(updated.slug),
    getCategoryUrl(existing.category),
    getCategoryUrl(updated.category),
  ]);

  return NextResponse.json({ ok: true, product: toAdminProductPayload(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.product.findUnique({
    where: { id: params.id },
    select: {
      slug: true,
      category: {
        select: {
          slug: true,
          parent: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  });
  if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  await prisma.product.delete({ where: { id: params.id } });
  revalidateCatalogCache();
  await submitIndexNowUrls([
    getHomepageUrl(),
    getProductUrl(existing.slug),
    getCategoryUrl(existing.category),
  ]);
  return NextResponse.json({ ok: true });
}
