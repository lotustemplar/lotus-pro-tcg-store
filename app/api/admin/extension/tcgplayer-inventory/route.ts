import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkBearer } from "@/lib/sync/signature";
import { parseTcgplayerExport } from "@/lib/sync/inventory-review";

export const dynamic = "force-dynamic";

// Receives the TCGplayer "Export From Live" CSV that the extension read from Filipe's own logged-in Seller Portal tab.
// Stores only the sealed (Unopened) rows. Read-only with respect to TCGplayer.
const schema = z.object({ csv: z.string().min(20).max(30_000_000), capturedAt: z.string().datetime().optional() });

export async function POST(req: NextRequest) {
  if (!checkBearer(req.headers.get("authorization"), process.env.EXTENSION_API_TOKEN)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Expected { csv }" }, { status: 400 });
  const head = parsed.data.csv.slice(0, 2000);
  if (!/TCGplayer Id/.test(head) || !/Total Quantity/.test(head)) return NextResponse.json({ error: "That isn't a TCGplayer pricing export (missing TCGplayer Id / Total Quantity columns)." }, { status: 422 });
  const rows = parseTcgplayerExport(parsed.data.csv);
  const snap = await prisma.tcgplayerSnapshot.create({
    data: { source: "extension", rowCount: rows.length, rowsJson: JSON.stringify(rows), capturedAt: parsed.data.capturedAt ? new Date(parsed.data.capturedAt) : new Date() },
  });
  // keep the last 10 snapshots
  const old = await prisma.tcgplayerSnapshot.findMany({ orderBy: { capturedAt: "desc" }, skip: 10, select: { id: true } });
  if (old.length) await prisma.tcgplayerSnapshot.deleteMany({ where: { id: { in: old.map((o) => o.id) } } });
  return NextResponse.json({ ok: true, sealedRows: rows.length, capturedAt: snap.capturedAt.toISOString() });
}
