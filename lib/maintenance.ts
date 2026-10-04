/**
 * Storefront "under construction" switch.
 *
 * Resolution order:
 *   1. MAINTENANCE_MODE env var (Vercel project setting) if set:
 *        "1" / "true" / "on"  -> construction page ON
 *        "0" / "false" / "off" -> construction page OFF
 *   2. Otherwise MAINTENANCE_DEFAULT below.
 *
 * Changing either requires a new production deployment (env vars are read at build/deploy time).
 * /admin, /api/admin and /api/webhooks always stay reachable so inventory can be edited and
 * Stripe webhooks for already-paid orders keep working.
 */
export const MAINTENANCE_DEFAULT = true;

/** SHA-256 (hex) of the private preview token. Visiting any page with ?preview=<token>
 *  sets a cookie that lets that browser see the real store while construction mode is on.
 *  Override with MAINTENANCE_PREVIEW_TOKEN_SHA256 env var to rotate the token. */
export const MAINTENANCE_PREVIEW_TOKEN_SHA256 = "900d1a9b598cfddd7daf8ab706b342ef12608af8cac99049fa1467cd27498d9d";

export const MAINTENANCE_PREVIEW_COOKIE = "lp_preview";
export const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;

export function isMaintenanceEnabled(): boolean {
  const raw = (process.env.MAINTENANCE_MODE || "").trim().toLowerCase();
  if (["1", "true", "on", "yes"].includes(raw)) return true;
  if (["0", "false", "off", "no"].includes(raw)) return false;
  return MAINTENANCE_DEFAULT;
}

export function previewTokenHash(): string {
  return (process.env.MAINTENANCE_PREVIEW_TOKEN_SHA256 || MAINTENANCE_PREVIEW_TOKEN_SHA256).trim().toLowerCase();
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Paths that keep working while construction mode is on. */
export function isMaintenanceExempt(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/api/admin/") || pathname === "/api/admin") return true;
  if (pathname.startsWith("/api/webhooks/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  if (pathname.startsWith("/branding/") || pathname.startsWith("/logo/")) return true;
  if (pathname === "/robots.txt" || pathname === "/social-preview.png" || pathname === "/favicon.ico") return true;
  // IndexNow key file and similar root-level static text files.
  if (/^\/[a-f0-9]{32}\.txt$/.test(pathname)) return true;
  return false;
}

export function maintenanceHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex" />
<title>Under Construction | Lotus Pro TCG</title>
<meta name="description" content="Lotus Pro TCG is updating its inventory. We'll be back soon." />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  html,body{min-height:100%}
  body{
    min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;
    color:#fff;font-family:'Manrope',system-ui,sans-serif;overflow-x:hidden;position:relative;
    background:
      radial-gradient(circle at top left, rgba(124,58,237,.22), transparent 38%),
      radial-gradient(circle at bottom right, rgba(212,175,55,.10), transparent 32%),
      linear-gradient(180deg,#070b14 0%,#0b1020 42%,#080c15 100%);
  }
  body::before,body::after{content:"";position:fixed;z-index:-1;border-radius:9999px;filter:blur(90px);opacity:.5;pointer-events:none}
  body::before{top:-140px;left:-90px;width:360px;height:360px;background:rgba(140,92,246,.28)}
  body::after{right:-120px;bottom:12%;width:320px;height:320px;background:rgba(212,175,55,.18)}
  .card{
    width:100%;max-width:640px;text-align:center;padding:44px 36px 36px;border-radius:28px;
    background:rgba(16,22,38,.82);border:1px solid rgba(255,255,255,.08);
    box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(124,58,237,.12) inset;backdrop-filter:blur(10px);
  }
  .logo{width:min(360px,80%);height:auto;margin:0 auto 26px;display:block;filter:drop-shadow(0 8px 30px rgba(124,58,237,.35))}
  .badge{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;
    color:#d4af37;background:rgba(212,175,55,.08);border:1px solid rgba(212,175,55,.35);margin-bottom:18px}
  .dot{width:8px;height:8px;border-radius:50%;background:#d4af37;animation:flicker 1.4s ease-in-out infinite}
  h1{font-family:'Space Grotesk','Manrope',system-ui,sans-serif;font-size:clamp(30px,6vw,44px);line-height:1.1;font-weight:700;margin-bottom:14px}
  h1 span{background:linear-gradient(90deg,#c4b5fd,#8b5cf6);-webkit-background-clip:text;background-clip:text;color:transparent}
  p{color:rgba(255,255,255,.72);font-size:17px;line-height:1.6;max-width:480px;margin:0 auto}
  .bar{height:6px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;margin:30px auto 0;max-width:360px}
  .bar i{display:block;height:100%;width:40%;border-radius:999px;background:linear-gradient(90deg,#7c3aed,#a78bfa,#d4af37);animation:slide 2.4s ease-in-out infinite}
  .foot{margin-top:28px;font-size:13px;color:rgba(255,255,255,.45)}
  @keyframes flicker{0%,100%{opacity:1}50%{opacity:.35}}
  @keyframes slide{0%{transform:translateX(-110%)}100%{transform:translateX(260%)}}
</style>
</head>
<body>
  <main class="card">
    <img class="logo" src="/branding/recovery/logo-wide.webp" alt="Lotus Pro TCG" width="1200" height="400" />
    <div class="badge"><span class="dot"></span>Under construction</div>
    <h1>We're updating our <span>inventory</span></h1>
    <p>Lotus Pro TCG is restocking and refreshing our shelves. The store is temporarily closed, but we'll be back soon with fresh sealed product, singles, and decks.</p>
    <div class="bar"><i></i></div>
    <div class="foot">Thanks for your patience &mdash; check back shortly.</div>
  </main>
</body>
</html>`;
}
