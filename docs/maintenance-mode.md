# Under-construction (maintenance) mode

`middleware.ts` + `lib/maintenance.ts` serve a branded "We're updating our inventory"
page with **HTTP 503 + `Retry-After: 3600`** for every storefront page, and a 503 JSON
error for storefront APIs (`/api/checkout`, `/api/search`, `/api/contact`,
`/api/restock-signup`). Nobody can browse, add to cart, or check out.

Always reachable: `/admin/*`, `/api/admin/*` (edit inventory), `/api/webhooks/*`
(Stripe), `/_next/*`, `/branding/*`, `/logo/*`, `/robots.txt`.

## Turn it OFF
Either:
- Vercel → Project → Settings → Environment Variables: set `MAINTENANCE_MODE=0`
  (Production), then redeploy the latest production deployment; or
- set `MAINTENANCE_DEFAULT = false` in `lib/maintenance.ts` and push to `main`.

## Turn it ON again
Set `MAINTENANCE_MODE=1` (or remove the env var while `MAINTENANCE_DEFAULT = true`)
and redeploy.

## Preview the real store while it is on
Open any URL with `?preview=<token>` once; the browser gets an `lp_preview` cookie for
14 days. `?preview=off` clears it. Only the SHA-256 of the token is stored in the repo;
rotate it with the `MAINTENANCE_PREVIEW_TOKEN_SHA256` env var.
