import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBearer } from "@/lib/sync/signature";
import { isSealedProductType } from "@/lib/sync/sealed";
import { getAllCategoriesWithParent } from "@/lib/admin";
import { findSuggestedCategoryId } from "@/lib/tcgplayer";
import { slugify } from "@/lib/format";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

export const dynamic = "force-dynamic";

const schema = z.object({
  tcgplayerProductId: z.number().int().positive(),
  name: z.string().min(2).max(300),
  setName: z.string().max(200).default(""),
  productLine: z.string().max(100).default(""),
  productType: z.string().max(100).default(""),
  imageUrl: z.string().url().optional(),
  marketPriceCents: z.number().int().min(0).nullable().optional(),
  priceCents: z.number().int().min(1),
  quantity: z.number().int().min(0).max(10000),
  mode: z.enum(["add", "set"]).default("add"),
  url: z.string().url().optional(),
});

function unauthorized() { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }

export async function GET(req: NextRequest) {
  if (!checkBearer(req.headers.get("authorization"), process.env.EXTENSION_API_TOKEN)) return unauthorized();
  const id = Number(req.nextUrl.searchParams.get("tcgplayerProductId"));
  const p = id ? await prisma.product.findFirst({ where: { sourceProductId: id }, select: { id: true, name: true, quantity: true, priceCents: true } }) : null;
  return NextResponse.json({ ok: true, product: p });
}

export async function POST(req: NextRequest) {
  if (!checkBearer(req.headers.get("authorization"), process.env.EXTENSION_API_TOKEN)) return unauthorized();
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid product data", issues: parsed.error.flatten() }, { status: 400 });
  const d = parsed.data;
  if (!isSealedProductType(d.productType, d.name)) {
    return NextResponse.json({ error: `Rejected: "${d.productType || "unknown type"}" is not a sealed product. The store is sealed-only.` }, { status: 422 });
  }
  const existing = await prisma.product.findFirst({ where: { sourceProductId: d.tcgplayerProductId } });
  if (existing) {
    const quantity = d.mode === "set" ? d.quantity : existing.quantity + d.quantity;
    const p = await prisma.product.update({ where: { id: existing.id }, data: { quantity, priceCents: d.priceCents, sourcePriceCents: d.marketPriceCents ?? existing.sourcePriceCents, isActive: true } });
    revalidateCatalogCache();
    return NextResponse.json({ ok: true, created: false, product: { id: p.id, name: p.name, quantity: p.quantity, priceCents: p.priceCents } });
  }
  const categories = await getAllCategoriesWithParent();
  let categoryId: string | null = null;
  try { categoryId = findSuggestedCategoryId(categories, { productLineName: d.productLine, productName: d.name, productTypeName: d.productType }); }
  catch (e) { return NextResponse.json({ error: e instanceof Error ? e.message : "No matching category" }, { status: 409 }); }
  if (!categoryId) return NextResponse.json({ error: "No category exists yet; create one in admin first." }, { status: 409 });
  let slug = slugify(d.name); let n = 1;
  while (await prisma.product.findUnique({ where: { slug } })) slug = `${slugify(d.name)}-${++n}`;
  const p = await prisma.product.create({
    data: {
      name: d.name, slug, priceCents: d.priceCents, quantity: d.quantity, categoryId,
      sourceMarketplace: "tcgplayer", sourceProductId: d.tcgplayerProductId, sourceUrl: d.url ?? `https://www.tcgplayer.com/product/${d.tcgplayerProductId}`,
      sourceProductLine: d.productLine || null, sourceSetName: d.setName || null, sourceProductType: d.productType || null,
      sourcePriceCents: d.marketPriceCents ?? null, sourceImageUrl: d.imageUrl ?? null, tcgplayerListingName: d.name,
      images: d.imageUrl ? { create: [{ url: d.imageUrl, altText: d.name }] } : undefined,
    },
  });
  revalidateCatalogCache();
  return NextResponse.json({ ok: true, created: true, product: { id: p.id, name: p.name, quantity: p.quantity, priceCents: p.priceCents } });
}
