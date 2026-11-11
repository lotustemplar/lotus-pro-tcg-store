import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkBearer } from "@/lib/sync/signature";
import { readInventoryQuantity, type InventoryDb } from "@/lib/admin-triage";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkBearer(req.headers.get("authorization"), process.env.EXTENSION_API_TOKEN)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const externalId = req.nextUrl.searchParams.get("externalId")?.trim() ?? "";
  if (!externalId || externalId.length > 200) {
    return NextResponse.json({ error: "externalId is required" }, { status: 400 });
  }

  const result = await readInventoryQuantity(prisma as unknown as InventoryDb, externalId);
  return NextResponse.json(result.body, { status: result.status });
}
