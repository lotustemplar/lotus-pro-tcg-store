import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const products = await searchProducts(q);

  return NextResponse.json({
    results: products.slice(0, 8).map((p) => ({
      slug: p.slug,
      name: p.name,
      priceCents: p.priceCents,
      image: p.images[0]?.url ?? null,
    })),
  });
}
