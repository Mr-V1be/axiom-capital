import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOrder } from "./order-validation.js";

const validInput = {
  accountCount: 1,
  totalEquity: 10_000,
  mixedMarkets: false,
  amount: 500,
  allocationMode: "fixed_quote" as const,
  allocationPercent: 5,
  type: "limit" as const,
  limitPrice: 118_000,
};

describe("order validation", () => {
  it("explains zero Spot capital instead of a generic failure", () => {
    const result = validateOrder({ ...validInput, totalEquity: 0 });
    assert.equal(result.valid, false);
    assert.match(result.message, /нет доступного USDT/);
  });

  it("applies the backend allocation risk limit to fixed quote orders", () => {
    const result = validateOrder({ ...validInput, amount: 1_001 });
    assert.equal(result.valid, false);
    assert.match(result.message, /10%/);
  });

  it("accepts a funded order within the risk limit", () => {
    assert.equal(validateOrder(validInput).valid, true);
  });
});
