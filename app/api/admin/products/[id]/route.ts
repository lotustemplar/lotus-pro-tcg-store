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

  const { images, ...data } = parsed.data;

  const dupe = await prisma.product.findFirst({
    where: { slug: data.slug, NOT: { id: params.id } },
  });
  if (dupe) {
    return NextResponse.json({ error: "Another product already uses that slug." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.productImage.deleteMany({ where: { productId: params.id } }),
    prisma.product.update({
      where: { id: params.id },
      data: {
        ...data,
        images: { create: images.map((img, idx) => ({ ...img, sortOrder: idx })) },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = inlineProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.product.update({
    where: { id: params.id },
    data: parsed.data,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
