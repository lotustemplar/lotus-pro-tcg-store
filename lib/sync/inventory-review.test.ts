import test from "node:test";
import assert from "node:assert/strict";
import { buildInventoryReview } from "@/lib/sync/inventory-review";
const p = (id: string, q: number) => ({ id, name: id, sourceSetName: null, quantity: q, isActive: true, sourceProductId: null, manapoolProductId: id, tcgplayerSku: Number(id.slice(1)) });
const mp = (id: string, q: number) => ({ productId: id, tcgsku: null, tcgplayerId: null, quantity: q, name: id });
const tc = (sku: number, q: number) => ({ sku, name: "x" + sku, productLine: "", setName: "", quantity: q });
test("one-channel rule", () => {
  const r = buildInventoryReview([p("a1", 0), p("a2", 1), p("a3", 1)], [mp("a1", 1), mp("a2", 2), mp("a3", 0)], [tc(1, 0), tc(2, 3), tc(3, 4)]);
  const by = Object.fromEntries(r.map((x) => [x.productId, x]));
  assert.equal(by.a1.proposedQty, 1); assert.equal(by.a1.status, "change");
  assert.equal(by.a2.status, "flag");
  assert.equal(by.a3.proposedQty, 4);
});
