import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBearer } from "@/lib/sync/signature";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import { setAbsoluteQuantity, type InventoryDb } from "@/lib/admin-triage";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!checkBearer(req.headers.get("authorization"), process.env.EXTENSION_API_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await setAbsoluteQuantity(
    prisma as unknown as InventoryDb,
    await req.json().catch(() => null),
  );
  if (result.revalidate) revalidateCatalogCache();
  return NextResponse.json(result.body, { status: result.status });
}
