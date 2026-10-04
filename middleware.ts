import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  MAINTENANCE_PREVIEW_COOKIE,
  MAINTENANCE_RETRY_AFTER_SECONDS,
  isMaintenanceEnabled,
  isMaintenanceExempt,
  maintenanceHtml,
  previewTokenHash,
  sha256Hex,
} from "@/lib/maintenance";

const SESSION_COOKIE = "lpd_admin_session";
const secretKey = () =>
  new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET || "dev-only-insecure-secret-change-me");

async function adminGuard(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin/login")) return NextResponse.next();
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
  try {
    await jwtVerify(token, secretKey());
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }
}

async function hasValidPreview(value: string | undefined | null) {
  if (!value) return false;
  const expected = previewTokenHash();
  if (!expected) return false;
  return (await sha256Hex(value)) === expected;
}

function maintenanceResponse(req: NextRequest) {
  const headers = {
    "Retry-After": String(MAINTENANCE_RETRY_AFTER_SECONDS),
    "Cache-Control": "no-store, max-age=0",
    "X-Robots-Tag": "noindex",
    "X-Maintenance-Mode": "1",
  };
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "The store is temporarily closed while we update our inventory. Please try again soon." },
      { status: 503, headers },
    );
  }
  return new NextResponse(req.method === "HEAD" ? null : maintenanceHtml(), {
    status: 503,
    headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

export async function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;

  if (isMaintenanceEnabled() && !isMaintenanceExempt(pathname)) {
    const previewParam = searchParams.get("preview");

    if (previewParam === "off") {
      const url = req.nextUrl.clone();
      url.searchParams.delete("preview");
      const res = NextResponse.redirect(url);
      res.cookies.delete(MAINTENANCE_PREVIEW_COOKIE);
      return res;
    }

    if (previewParam && (await hasValidPreview(previewParam))) {
      const url = req.nextUrl.clone();
      url.searchParams.delete("preview");
      const res = NextResponse.redirect(url);
      res.cookies.set(MAINTENANCE_PREVIEW_COOKIE, previewParam, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
      return res;
    }

    if (!(await hasValidPreview(req.cookies.get(MAINTENANCE_PREVIEW_COOKIE)?.value))) {
      return maintenanceResponse(req);
    }
  }

  return adminGuard(req);
}

export const config = {
  // Run on everything except Next.js build assets and the image optimizer.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
