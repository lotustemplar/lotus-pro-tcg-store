import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { syncTcgplayerProducts } from "@/lib/tcgplayer-sync";

export async function POST() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await syncTcgplayerProducts();
  return NextResponse.json({ ok: true, ...result });
}
