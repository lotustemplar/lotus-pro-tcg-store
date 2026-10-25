import { createHmac, timingSafeEqual } from "crypto";

export function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8"); const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Mana Pool: X-ManaPool-Signature "t=<ts>,v1=<hex>", v1 = HMAC-SHA256(secret, "v1:${ts}:${rawBody}"). */
export function verifyManapoolSignature(rawBody: string, header: string | null, secret: string | undefined, nowSec = Math.floor(Date.now() / 1000), maxAgeSec = 600) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  const t = Number(parts.t); const v1 = parts.v1;
  if (!t || !v1 || Math.abs(nowSec - t) > maxAgeSec) return false;
  const expected = createHmac("sha256", secret).update(`v1:${t}:${rawBody}`).digest("hex");
  return safeEqualHex(expected, v1);
}

/** Inbound email relay (Apps Script): X-Lotus-Signature = hex HMAC-SHA256(secret, `${ts}.${rawBody}`). */
export function verifyRelaySignature(rawBody: string, ts: string | null, sig: string | null, secret: string | undefined, nowSec = Math.floor(Date.now() / 1000)) {
  if (!ts || !sig || !secret) return false;
  if (Math.abs(nowSec - Number(ts)) > 600) return false;
  const expected = createHmac("sha256", secret).update(`${ts}.${rawBody}`).digest("hex");
  return safeEqualHex(expected, sig.toLowerCase());
}

/** Bearer token for machine/admin API (extension). Compares sha256 to avoid length leaks. */
export function checkBearer(authHeader: string | null, token: string | undefined) {
  if (!authHeader || !token || token.length < 24) return false;
  const got = authHeader.replace(/^Bearer\s+/i, "");
  const h = (s: string) => createHmac("sha256", "lotus-bearer").update(s).digest("hex");
  return safeEqualHex(h(got), h(token));
}
