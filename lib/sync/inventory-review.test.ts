import test from "node:test";
import assert from "node:assert/strict";
import { buildInventoryReview, parseTcgplayerExport } from "@/lib/sync/inventory-review";
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
test("TCGplayer qty-0 rows are dropped and behave like missing", () => {
  const csv = "TCGplayer Id,Product Line,Set Name,Product Name,Condition,Total Quantity\n5,MTG,S,Box,Unopened,0\n6,MTG,S,Bundle,Unopened,2\n";
  assert.deepEqual(parseTcgplayerExport(csv).map((r) => r.sku), [6]);
  const r = buildInventoryReview([p("a5", 0)], [mp("a5", 3)], [tc(5, 0)]);
  assert.equal(r[0].tcgplayerQty, null); assert.equal(r[0].proposedQty, 3);
});
test("rows at 0 everywhere are hidden", () => {
  const r = buildInventoryReview([p("a7", 0), p("a8", 1)], [mp("a7", 0), mp("a8", 0)], [tc(7, 0)]);
  assert.deepEqual(r.map((x) => x.productId), ["a8"]);
});
