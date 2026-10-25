import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { buildStagedCsv } from "@/lib/sync/tcgplayer-csv";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const changes = await prisma.channelChange.findMany({ where: { channel: "tcgplayer", status: "pending" }, include: { product: true } });
  const byProduct = new Map<string, { delta: number; p: (typeof changes)[number]["product"] }>();
  for (const c of changes) {
    const cur = byProduct.get(c.productId) ?? { delta: 0, p: c.product };
    cur.delta += c.delta; byProduct.set(c.productId, cur);
  }
  const csv = buildStagedCsv([...byProduct.values()].map(({ delta, p }) => ({
    tcgplayerId: p.tcgplayerSku ?? null, productLine: p.sourceProductLine ?? "", setName: p.sourceSetName ?? "",
    productName: p.tcgplayerListingName ?? p.name, condition: "Unopened", addToQuantity: delta,
    marketplacePriceCents: p.sourcePriceCents ?? p.priceCents,
  })));
  await prisma.channelChange.updateMany({ where: { id: { in: changes.map((c) => c.id) } }, data: { status: "exported", appliedAt: new Date() } });
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  return new NextResponse(csv, { headers: { "content-type": "text/csv", "content-disposition": `attachment; filename="tcgplayer-staged-${stamp}.csv"` } });
}
