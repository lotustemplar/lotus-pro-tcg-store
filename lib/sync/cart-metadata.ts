// Encode the cart into Stripe metadata so the Order is created only after payment.
export type CartLine = { productId: string; quantity: number; priceCents: number };
const MAX = 480;

export function encodeCart(lines: CartLine[]): Record<string, string> {
  const out: Record<string, string> = {};
  let key = 0; let cur = "";
  for (const l of lines) {
    const tok = `${l.productId}:${l.quantity}:${l.priceCents}`;
    if (cur && cur.length + tok.length + 1 > MAX) { out[`cart${key++}`] = cur; cur = ""; }
    cur = cur ? `${cur},${tok}` : tok;
  }
  if (cur) out[`cart${key++}`] = cur;
  if (key > 40) throw new Error("Cart too large for checkout metadata");
  out.cartParts = String(key);
  return out;
}

export function decodeCart(meta: Record<string, string> | null | undefined): CartLine[] {
  if (!meta?.cartParts) return [];
  const lines: CartLine[] = [];
  for (let i = 0; i < Number(meta.cartParts); i++) {
    for (const tok of (meta[`cart${i}`] || "").split(",").filter(Boolean)) {
      const [productId, q, p] = tok.split(":");
      lines.push({ productId, quantity: Number(q), priceCents: Number(p) });
    }
  }
  return lines;
}
