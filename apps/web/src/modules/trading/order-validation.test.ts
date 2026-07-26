import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateOrder } from "./order-validation.js";

const validInput = {
  accountEquities: [10_000],
  totalEquity: 10_000,
  mixedMarkets: false,
  amount: 500,
  allocationMode: "fixed_quote" as const,
  allocationPercent: 5,
  marketType: "spot" as const,
  leverage: 1,
  type: "limit" as const,
  limitPrice: 118_000,
  marketPrice: 118_000,
  minimumOrderAmount: 0.000001,
  contractSize: null,
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

  it("accepts a minimum BTC contract when leverage makes it large enough", () => {
    const result = validateOrder({
      ...validInput,
      accountEquities: [5],
      totalEquity: 5,
      amount: 0.5,
      marketType: "swap",
      leverage: 20,
      limitPrice: 64_642,
      marketPrice: 64_642,
      minimumOrderAmount: 1,
      contractSize: 0.0001,
    });

    assert.equal(result.valid, true);
    assert.match(result.message, /позиция 10.00 USDT/);
  });

  it("blocks a futures order below the minimum on any selected account", () => {
    const result = validateOrder({
      ...validInput,
      accountEquities: [5],
      totalEquity: 5,
      amount: 0.5,
      marketType: "swap",
      leverage: 1,
      limitPrice: 64_642,
      marketPrice: 64_642,
      minimumOrderAmount: 1,
      contractSize: 0.0001,
    });

    assert.equal(result.valid, false);
    assert.match(result.message, /Минимум MEXC/);
  });
});
