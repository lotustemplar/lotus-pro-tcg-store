import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { parseTcgplayerSaleEmail } from "./tcgplayer-email";
import { verifyManapoolSignature, verifyRelaySignature, checkBearer } from "./signature";
import { encodeCart, decodeCart } from "./cart-metadata";
import { buildStagedCsv, STAGED_HEADER } from "./tcgplayer-csv";
import { isSealedProductType } from "./sealed";
import { diffSealed, tcgExportQuantities } from "./reconcile";

const EMAIL = `Filipe,\r\n\r\n   Payment for this order has been received.\n\r\n  Order: 25BD25A8-7F58F1-BE2A3 (https://store.tcgplayer.com/admin/orders/manageorder/25BD25A8-7F58F1-BE2A3)\n\r\n Order Total: $885.00\n\r\n   ORDER DETAILS\n\r\n  See all > (https://store.tcgplayer.com/admin/orders/orderlist)\n\t\n\r\n    \r\n   1\n\r\n   Secrets of Strixhaven - Play Booster Display Case/Unopened\n\r\n  \t\r\n   2\n\r\n  Brainstorm/Near Mint\n\r\n  Remember to ship this order no later than 48 hours after the order date of 10/12/2026.\r\n Thanks, \n Team TCGplayer`;

test("parses a real-format TCGplayer sale email", () => {
  const s = parseTcgplayerSaleEmail(EMAIL)!;
  assert.equal(s.order, "25BD25A8-7F58F1-BE2A3");
  assert.deepEqual(s.lines, [
    { qty: 1, name: "Secrets of Strixhaven - Play Booster Display Case", condition: "Unopened" },
    { qty: 2, name: "Brainstorm", condition: "Near Mint" },
  ]);
  assert.equal(s.direct, false);
  assert.equal(parseTcgplayerSaleEmail("hello"), null);
});

test("Mana Pool HMAC signature", () => {
  const body = '{"order":{"id":"x"}}'; const t = 1700000000; const secret = "s3cret";
  const v1 = createHmac("sha256", secret).update(`v1:${t}:${body}`).digest("hex");
  assert.ok(verifyManapoolSignature(body, `t=${t},v1=${v1}`, secret, t + 5));
  assert.ok(!verifyManapoolSignature(body + " ", `t=${t},v1=${v1}`, secret, t + 5));
  assert.ok(!verifyManapoolSignature(body, `t=${t},v1=${v1}`, secret, t + 5000));
  assert.ok(!verifyManapoolSignature(body, `t=${t},v1=${v1}`, undefined, t));
});

test("relay signature and bearer", () => {
  const body = "{}"; const ts = "1700000000"; const secret = "relay";
  const sig = createHmac("sha256", secret).update(`${ts}.${body}`).digest("hex");
  assert.ok(verifyRelaySignature(body, ts, sig, secret, 1700000001));
  assert.ok(!verifyRelaySignature(body, ts, sig, "other", 1700000001));
  const tok = "x".repeat(32);
  assert.ok(checkBearer(`Bearer ${tok}`, tok));
  assert.ok(!checkBearer(`Bearer ${tok}y`, tok));
  assert.ok(!checkBearer(`Bearer short`, "short"));
});

test("cart metadata round trip and size split", () => {
  const lines = Array.from({ length: 30 }, (_, i) => ({ productId: `cm${String(i).padStart(23, "0")}`, quantity: i + 1, priceCents: 1000 + i }));
  const meta = encodeCart(lines);
  assert.ok(Object.values(meta).every((v) => v.length <= 500));
  assert.deepEqual(decodeCart(meta), lines);
});

test("staged CSV uses export header and signed deltas", () => {
  const csv = buildStagedCsv([{ tcgplayerId: 123, productLine: "Magic", setName: "Set, X", productName: "Box", condition: "Unopened", addToQuantity: -2, marketplacePriceCents: 12999 }]);
  const [h, r] = csv.trim().split("\n");
  assert.equal(h, STAGED_HEADER.join(","));
  assert.equal(h.split(",").length, 16);
  assert.match(r, /^123,Magic,"Set, X",Box,,,,Unopened,,,,,,-2,129.99,$/);
});

test("sealed filter rejects singles", () => {
  assert.equal(isSealedProductType("Cards", "Brainstorm"), false);
  assert.equal(isSealedProductType("Booster Box", "X"), true);
  assert.equal(isSealedProductType("Sealed Products", "X"), true);
  assert.equal(isSealedProductType("", "Duskmourn Collector Booster Display"), true);
});

test("reconcile diff", () => {
  const store = [{ id: "a", name: "A", quantity: 3, manapoolProductId: "mp1", tcgplayerSku: 11 }];
  const tcg = tcgExportQuantities("TCGplayer Id,Condition,Total Quantity\n11,Unopened,5\n12,Near Mint,1\n");
  const rows = diffSealed(store, new Map([["mp1", 3]]), tcg);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].proposedStoreQty, null); // MP 3 vs TCG 5 -> flagged, not picked
  const agree = diffSealed(store, new Map([["mp1", 5]]), tcg);
  assert.equal(agree[0].proposedStoreQty, 5);
  assert.equal(agree[0].action, "set store qty 3 -> 5");
  assert.equal(diffSealed(store, new Map([["mp1", 3]]), null).length, 0);
});
