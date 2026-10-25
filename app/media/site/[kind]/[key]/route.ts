import { NextResponse } from "next/server";
import { getSiteMediaValue, type SiteMediaKind } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

const KINDS = new Set<SiteMediaKind>(["hero", "category", "logo"]);

export async function GET(_req: Request, { params }: { params: { kind: string; key: string } }) {
  const kind = params.kind as SiteMediaKind;
  if (!KINDS.has(kind)) return new NextResponse("Not found", { status: 404 });

  const value = await getSiteMediaValue(kind, decodeURIComponent(params.key));
  const match = value?.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
  if (!match) return new NextResponse("Not found", { status: 404 });

  const body = Buffer.from(match[2], "base64");
  return new NextResponse(body, {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(body.length),
      // URL carries a content hash (?v=), so it is safe to cache for a year.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
