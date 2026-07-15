import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { syncTcgplayerProducts } from "@/lib/tcgplayer-sync";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncTcgplayerProducts();
  revalidateCatalogCache();
  return NextResponse.json({ ok: true, ...result });
}
