import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { isDatabaseQuotaExceededError, syncTcgplayerProducts } from "@/lib/tcgplayer-sync";
import { revalidateCatalogCache } from "@/lib/storefront-cache";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await syncTcgplayerProducts();
    revalidateCatalogCache();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (isDatabaseQuotaExceededError(error)) {
      return NextResponse.json(
        {
          error:
            "TCGPlayer sync is temporarily unavailable because the Neon database is over quota and rejecting reads.",
        },
        { status: 503 },
      );
    }

    throw error;
  }
}
