import { NextRequest, NextResponse } from "next/server";
import { searchProducts } from "@/lib/products";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const products = await searchProducts(q, 8);

  return NextResponse.json(
    {
      results: products.map((p) => ({
        slug: p.slug,
        name: p.name,
        priceCents: p.priceCents,
        image: p.images[0]?.url ?? null,
      })),
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    },
  );
}
