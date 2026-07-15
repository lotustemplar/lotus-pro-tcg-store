import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/auth";
import { revalidateCatalogCache } from "@/lib/storefront-cache";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  parentId: z.string().nullable().optional(),
  navStyle: z.enum(["default", "patreon"]).default("default"),
});

export async function POST(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const category = await prisma.category.create({
    data: {
      ...parsed.data,
      isTopLevel: !parsed.data.parentId,
    },
  });
  revalidateCatalogCache();

  return NextResponse.json({ ok: true, id: category.id });
}
