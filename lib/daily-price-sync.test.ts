import test from "node:test";
import assert from "node:assert/strict";
import { roundUpTo97Cents, storePriceFromMarketCents } from "@/lib/daily-price-sync";

test("rounds up to the next .97", () => {
  assert.equal(roundUpTo97Cents(4720), 4797);
  assert.equal(roundUpTo97Cents(4798), 4897);
  assert.equal(roundUpTo97Cents(4797), 4797);
  assert.equal(roundUpTo97Cents(4700), 4797);
  assert.equal(roundUpTo97Cents(50), 97);
});

test("market x 0.95 then round up", () => {
  assert.equal(storePriceFromMarketCents(10000), 9597); // 95.00
  assert.equal(storePriceFromMarketCents(5000), 4797); // 47.50
  assert.equal(storePriceFromMarketCents(5050), 4897); // 47.975 -> 48.97
});
