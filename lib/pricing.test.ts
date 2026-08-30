import test from "node:test";
import assert from "node:assert/strict";
import { getDiscountedStorePriceCents, roundDownStorePriceTo97Cents } from "@/lib/pricing";

test("rounds store prices down to the nearest lower .97 value", () => {
  assert.equal(roundDownStorePriceTo97Cents(8445), 8397);
  assert.equal(roundDownStorePriceTo97Cents(1201), 1197);
  assert.equal(roundDownStorePriceTo97Cents(1598), 1597);
  assert.equal(roundDownStorePriceTo97Cents(1597), 1597);
  assert.equal(roundDownStorePriceTo97Cents(100), 97);
  assert.equal(roundDownStorePriceTo97Cents(99), 97);
});

test("applies the TCGplayer discount cap before the .97 floor rule", () => {
  assert.equal(getDiscountedStorePriceCents(8889), 8397);
  assert.equal(getDiscountedStorePriceCents(1264), 1197);
  assert.equal(getDiscountedStorePriceCents(1682), 1597);
  assert.equal(getDiscountedStorePriceCents(60000), 57497);
});
