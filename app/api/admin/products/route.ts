import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
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
  return {
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
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const normalized = normalizeProductInput(parsed.data);
  const { images, ...data } = normalized;

  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "A product with that slug already exists." }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({
      data: {
        ...data,
        images: { create: images.map((img, idx) => ({ ...img, sortOrder: idx })) },
      },
    });

    return NextResponse.json({ ok: true, id: product.id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.join(", ") : "a unique field";
      return NextResponse.json({ error: `A product already uses ${target}.` }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "Choose a valid category before saving this product." }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create product." }, { status: 500 });
  }
}
