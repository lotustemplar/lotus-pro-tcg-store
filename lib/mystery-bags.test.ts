import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTruthfulClaims,
  calculateMysteryMetrics,
  classifyMysteryTier,
  grossCollectedPerBagCents,
  netRevenueBeforePackCostsCents,
  optimizeMysteryBatch,
  paymentFeeCents,
  protectedMinBagValueCents,
  requiredProductPriceCents,
  simplifyFraction,
  type GeneratedBag,
  type MysteryPack,
  type MysteryRules,
} from "./mystery-bags";

const rules: MysteryRules = {
  costBasis: "market", minPacksPerBag: 3, maxPacksPerBag: 6, productPriceCents: 3299, shippingCollectedCents: 599,
  postageCents: 800, suppliesCents: 80, paymentPercent: 2.9, fixedPaymentFeeCents: 30, platformFeeCents: 0,
  minBagValueCents: 2500, minBasicPacks: 1, allowDuplicatePacks: false, allowDuplicateSets: false, maxCopiesSamePack: 1,
  basicOnlyBagCount: 15, premiumBagCount: 8, ultraPremiumBagCount: 1, minBatchMarginPercent: 5, useEveryPack: false,
  leaveUnassigned: true, bagCount: 24,
};

const basicInventory: MysteryPack[] = [
  ["b1", "Basic One", 24, 500], ["b2", "Basic Two", 24, 525], ["b3", "Basic Three", 24, 550], ["b4", "Basic Four", 24, 575], ["b5", "Basic Five", 24, 600],
].map(([id, name, quantity, value]) => ({ id: String(id), name: String(name), setName: String(name), quantity: Number(quantity), unitCostCents: Number(value), marketValueCents: Number(value), tier: "Basic" }));
const exactInventory: MysteryPack[] = [...basicInventory, { id: "p1", name: "Premium One", setName: "Premium One", quantity: 8, unitCostCents: 800, marketValueCents: 800, tier: "Premium" }, { id: "u1", name: "Ultra One", setName: "Ultra One", quantity: 1, unitCostCents: 2500, marketValueCents: 2500, tier: "Ultra Premium" }];

function metricBags(values: number[], outcomes: Array<"Basic-only" | "Premium" | "Ultra Premium">): GeneratedBag[] {
  return values.map((value, index) => ({ bagNumber: index + 1, code: `B-${index + 1}`, packs: [], totalMarketValueCents: value, totalCostCents: value, profitCents: 0, outcome: outcomes[index] }));
}

test("classifies tiers without changing the established thresholds", () => {
  assert.equal(classifyMysteryTier(799), "Basic"); assert.equal(classifyMysteryTier(800), "Premium"); assert.equal(classifyMysteryTier(2499), "Premium"); assert.equal(classifyMysteryTier(2500), "Ultra Premium");
});

test("applies the percentage payment fee to product price plus shipping and rounds cents", () => {
  assert.equal(grossCollectedPerBagCents(rules), 3898);
  assert.equal(paymentFeeCents(rules), 113);
  assert.equal(netRevenueBeforePackCostsCents(rules), 2875);
});

test("adds a configurable market-swing buffer above the advertised floor", () => {
  assert.equal(protectedMinBagValueCents({ minBagValueCents: 2500, marketValueBufferPercent: 1 }), 2525);
  assert.equal(protectedMinBagValueCents({ minBagValueCents: 2500, marketValueBufferPercent: 0 }), 2500);
});

test("calculates the default 24-bag 5% profit requirement and dynamic market ceiling", () => {
  const bags = metricBags(Array.from({ length: 24 }, () => 2500), [...Array.from({ length: 15 }, () => "Basic-only" as const), ...Array.from({ length: 8 }, () => "Premium" as const), "Ultra Premium"]);
  const metrics = calculateMysteryMetrics(bags, rules);
  assert.equal(metrics.totalGrossRevenueCents, 93552);
  assert.equal(metrics.netRevenueBeforePackCostsCents, 69000);
  assert.equal(metrics.minimumRequiredProfitCents, 4678);
  assert.equal(metrics.maxAllowableMarketValueCents, 64322);
});

test("accepts the $613.43 hypothetical batch at approximately 8.18% margin", () => {
  const values = [...Array.from({ length: 23 }, () => 2500), 3843];
  const outcomes = [...Array.from({ length: 15 }, () => "Basic-only" as const), ...Array.from({ length: 8 }, () => "Premium" as const), "Ultra Premium" as const];
  const metrics = calculateMysteryMetrics(metricBags(values, outcomes), rules);
  assert.equal(metrics.totalMarketValueCents, 61343);
  assert.equal(metrics.totalReplacementCostProfitCents, 7657);
  assert.equal(metrics.marginPercent, 8.1848);
});

test("rejects the prior $234.74 eight-bag example with the corrected $4.74 loss", () => {
  const eightRules = { ...rules, bagCount: 8 };
  const bags = metricBags([...Array.from({ length: 7 }, () => 2934), 2936], Array.from({ length: 8 }, () => "Basic-only" as const));
  const metrics = calculateMysteryMetrics(bags, eightRules);
  assert.equal(metrics.netRevenueBeforePackCostsCents, 23000);
  assert.equal(metrics.totalReplacementCostProfitCents, -474);
});

test("generates exact 15/8/1 outcomes with three-to-six packs and a $25 floor", () => {
  const result = optimizeMysteryBatch(exactInventory, { ...rules, productPriceCents: 3999 }, "exact-seed");
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.metrics.exactOutcomeCounts, { "Basic-only": 15, Premium: 8, "Ultra Premium": 1 });
  assert.ok(result.bags.every((bag) => { const count = bag.packs.reduce((sum, pack) => sum + pack.quantity, 0); return count >= 3 && count <= 6 && bag.totalMarketValueCents >= 2500 && bag.packs.some((pack) => pack.tier === "Basic"); }));
  assert.equal(result.claims.find((claim) => claim.label === "Premium specifically")?.fraction, "1/3");
  assert.equal(result.claims.find((claim) => claim.label === "Ultra Premium")?.fraction, "1/24");
  assert.equal(result.claims.find((claim) => claim.label === "Premium or better")?.fraction, "3/8");
});

test("does not accept ceiling-based approximate odds", () => {
  const result = optimizeMysteryBatch(exactInventory, { ...rules, bagCount: 4, basicOnlyBagCount: 2, premiumBagCount: 1, ultraPremiumBagCount: 0 }, "wrong-total");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostics.join(" "), /exact outcome counts must add up/i);
});

test("enforces duplicate-pack, duplicate-set, and inventory quantity restrictions", () => {
  const duplicateResult = optimizeMysteryBatch([{ id: "one", name: "One", setName: "Set", quantity: 20, unitCostCents: 500, marketValueCents: 500, tier: "Basic" }, { id: "two", name: "Two", setName: "Set", quantity: 20, unitCostCents: 500, marketValueCents: 500, tier: "Basic" }], { ...rules, bagCount: 1, basicOnlyBagCount: 1, premiumBagCount: 0, ultraPremiumBagCount: 0, allowDuplicatePacks: true, allowDuplicateSets: false, maxCopiesSamePack: 6 }, "duplicates");
  assert.equal(duplicateResult.ok, false);
  const quantityResult = optimizeMysteryBatch([{ ...basicInventory[0], quantity: 2 }], { ...rules, bagCount: 1, basicOnlyBagCount: 1, premiumBagCount: 0, ultraPremiumBagCount: 0 }, "quantity");
  assert.equal(quantityResult.ok, false);
});

test("returns an exact impossible-batch diagnostic instead of approving a partial batch", () => {
  const result = optimizeMysteryBatch(basicInventory, { ...rules, bagCount: 1, basicOnlyBagCount: 0, premiumBagCount: 0, ultraPremiumBagCount: 1 }, "impossible");
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.diagnostics.join(" "), /Ultra Premium|exact requested outcome counts|Market Value floor/i);
});

test("required product price uses integer-cent search and honors the selected margin", () => {
  const bags = metricBags(Array.from({ length: 24 }, () => 2500), [...Array.from({ length: 15 }, () => "Basic-only" as const), ...Array.from({ length: 8 }, () => "Premium" as const), "Ultra Premium"]);
  const price = requiredProductPriceCents(bags, rules);
  const metrics = calculateMysteryMetrics(bags, { ...rules, productPriceCents: price });
  const previous = calculateMysteryMetrics(bags, { ...rules, productPriceCents: price - 1 });
  assert.ok(metrics.totalReplacementCostProfitCents > 0 && metrics.marginPercent >= 5);
  assert.ok(previous.totalReplacementCostProfitCents <= 0 || previous.marginPercent < 5);
});

test("truthful claims use exact finalized outcomes and four-decimal odds", () => {
  const bags = metricBags(Array.from({ length: 24 }, () => 2500), [...Array.from({ length: 15 }, () => "Basic-only" as const), ...Array.from({ length: 8 }, () => "Premium" as const), "Ultra Premium"]);
  const claims = buildTruthfulClaims(bags);
  assert.equal(claims.find((claim) => claim.label === "Premium specifically")?.percentage, 33.3333);
  assert.equal(claims.find((claim) => claim.label === "Ultra Premium")?.percentage, 4.1667);
  assert.equal(simplifyFraction(9, 24), "3/8");
});
