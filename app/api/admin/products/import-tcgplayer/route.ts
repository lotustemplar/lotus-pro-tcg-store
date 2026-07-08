import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { getAllCategoriesWithParent } from "@/lib/admin";
import { importFromTcgplayerUrl } from "@/lib/tcgplayer";

const importSchema = z.object({
  url: z.string().url(),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Paste a valid TCGplayer product URL." }, { status: 400 });
  }

  try {
    const categories = await getAllCategoriesWithParent();
    const imported = await importFromTcgplayerUrl(parsed.data.url, categories);
    return NextResponse.json(imported);
  } catch (error) {
    const message = error instanceof Error ? error.message : "TCGplayer import failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
