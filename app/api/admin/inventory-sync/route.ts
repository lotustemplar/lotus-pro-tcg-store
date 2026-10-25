import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { listSealedInventory } from "@/lib/sync/manapool";
import { buildInventoryReview, dropZeroTcgRows, parseTcgplayerExport } from "@/lib/sync/inventory-review";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Read-only: Mana Pool API (read) + optional uploaded TCGplayer pricing export CSV -> review rows.
export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("tcgplayerCsv");
  let tcg = file && typeof file !== "string" && file.size > 0 ? parseTcgplayerExport(await file.text()) : null;
  let tcgLabel = tcg ? `${tcg.length} sealed rows in stock from uploaded export` : "no TCGplayer data (send it from the extension or upload the export)";
  if (!tcg) {
    try {
      const snap = await prisma.tcgplayerSnapshot.findFirst({ orderBy: { capturedAt: "desc" } });
      if (snap) { tcg = dropZeroTcgRows(JSON.parse(snap.rowsJson)); tcgLabel = `TCGplayer data from ${snap.capturedAt.toISOString()} (${tcg?.length ?? 0} sealed rows in stock, via extension)`; }
    } catch { tcgLabel = "TCGplayer snapshot storage not set up yet (migration pending); upload the export instead"; }
  }
  let mp = null as Awaited<ReturnType<typeof listSealedInventory>> | null; let mpError: string | null = null;
  try { mp = await listSealedInventory(); } catch (e) { mpError = e instanceof Error ? e.message : "Mana Pool error"; }
  const store = await prisma.product.findMany({
    select: { id: true, name: true, sourceSetName: true, quantity: true, isActive: true, sourceProductId: true, manapoolProductId: true, tcgplayerSku: true },
  });
  const rows = buildInventoryReview(store, mp, tcg);
  return NextResponse.json({
    rows,
    sources: { manapool: mp ? `${mp.length} sealed listings` : `unavailable: ${mpError}`, tcgplayer: tcgLabel },
    generatedAt: new Date().toISOString(),
  });
}
