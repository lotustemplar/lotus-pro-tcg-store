// Mana Pool seller API (documented token headers). Writes are gated by MANAPOOL_WRITES_ENABLED=1.
const BASE = "https://manapool.com/api/v1";

function headers() {
  const email = process.env.MANAPOOL_EMAIL; const token = process.env.MANAPOOL_ACCESS_TOKEN;
  if (!email || !token) throw new Error("Mana Pool API credentials are not configured");
  return { "X-ManaPool-Email": email, "X-ManaPool-Access-Token": token, "content-type": "application/json", accept: "application/json" };
}

export function manapoolWritesEnabled() {
  return process.env.MANAPOOL_WRITES_ENABLED === "1";
}

export async function getSealedListing(productId: string): Promise<{ quantity: number; price_cents: number } | null> {
  const res = await fetch(`${BASE}/seller/inventory/product/mtg_sealed/${encodeURIComponent(productId)}`, { headers: headers(), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Mana Pool GET ${res.status}`);
  const j = await res.json();
  const item = j.inventory ?? j;
  return { quantity: Number(item.quantity ?? 0), price_cents: Number(item.price_cents ?? 0) };
}

/** Apply a delta as an absolute write: read current, set max(0, cur+delta), keep price. */
export async function applySealedDelta(productId: string, delta: number) {
  if (!manapoolWritesEnabled()) throw new Error("Mana Pool writes are disabled (MANAPOOL_WRITES_ENABLED != 1)");
  const cur = await getSealedListing(productId);
  if (!cur) return { skipped: "not listed" as const };
  const quantity = Math.max(0, cur.quantity + delta);
  const res = await fetch(`${BASE}/seller/inventory/product/mtg_sealed/${encodeURIComponent(productId)}`, {
    method: "PUT", headers: headers(), body: JSON.stringify({ quantity, price_cents: cur.price_cents }),
  });
  if (!res.ok) throw new Error(`Mana Pool PUT ${res.status}`);
  return { before: cur.quantity, after: quantity };
}

export async function listSealedInventory(): Promise<{ productId: string; tcgsku: number | null; tcgplayerId: number | null; quantity: number; name: string }[]> {
  const out: { productId: string; tcgsku: number | null; tcgplayerId: number | null; quantity: number; name: string }[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 50; i++) {
    const url = new URL(`${BASE}/seller/inventory`);
    url.searchParams.set("limit", "1000");
    if (cursor) url.searchParams.set("cursor", cursor);
    const res = await fetch(url, { headers: headers(), cache: "no-store" });
    if (!res.ok) throw new Error(`Mana Pool inventory ${res.status}`);
    const j = await res.json();
    for (const it of j.inventory ?? []) {
      if (it.product_type !== "mtg_sealed") continue;
      out.push({ productId: it.product_id, tcgsku: it.product?.tcgplayer_sku ?? it.tcgsku ?? null, tcgplayerId: it.product?.sealed?.tcgplayer_id ?? it.product?.tcgplayer_id ?? null, quantity: Number(it.quantity ?? 0), name: it.product?.name ?? it.product?.single?.name ?? it.product?.sealed?.name ?? "" });
    }
    cursor = j.pagination?.next_cursor ?? j.next_cursor ?? null;
    if (!cursor) break;
  }
  return out;
}
