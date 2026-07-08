import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { z } from "zod";

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

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { images, ...data } = parsed.data;

  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) {
    return NextResponse.json({ error: "A product with that slug already exists." }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      ...data,
      images: { create: images.map((img, idx) => ({ ...img, sortOrder: idx })) },
    },
  });

  return NextResponse.json({ ok: true, id: product.id });
}
