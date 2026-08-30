import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

function encodeObjectPath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "site-media";

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Supabase Storage is not configured yet. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to the server environment." },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null) as {
    filename?: unknown;
    contentType?: unknown;
    size?: unknown;
  } | null;
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType : "";
  const size = typeof body?.size === "number" ? body.size : 0;

  if (!filename.toLowerCase().endsWith(".mp4") || contentType !== "video/mp4") {
    return NextResponse.json({ error: "Only MP4 video files are supported." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "That MP4 is over the 50 MB admin upload limit. Paste a hosted MP4 URL instead." }, { status: 413 });
  }

  const objectPath = `homepage/hero-${randomUUID()}.mp4`;
  const encodedBucket = encodeURIComponent(bucket);
  const encodedPath = encodeObjectPath(objectPath);
  const signResponse = await fetch(`${supabaseUrl}/storage/v1/object/upload/sign/${encodedBucket}/${encodedPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!signResponse.ok) {
    return NextResponse.json({ error: "Supabase Storage could not prepare the upload. Confirm the site-media bucket exists." }, { status: 502 });
  }

  const signData = await signResponse.json().catch(() => null) as { url?: unknown } | null;
  if (typeof signData?.url !== "string") {
    return NextResponse.json({ error: "Supabase Storage returned an invalid upload URL." }, { status: 502 });
  }

  const uploadUrl = `${supabaseUrl}/storage/v1${signData.url}`;

  return NextResponse.json({
    ok: true,
    uploadUrl,
    videoUrl: `${supabaseUrl}/storage/v1/object/public/${encodedBucket}/${encodedPath}`,
  });
}
