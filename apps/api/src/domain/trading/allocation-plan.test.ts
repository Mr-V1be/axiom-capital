import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Money } from "../shared/money.js";
import { ProportionalAllocationStrategy } from "./allocation-plan.js";

const strategy = new ProportionalAllocationStrategy();
const target = (accountId: string, equity: number) => ({
  accountId,
  equity: Money.of(equity, "USDT"),
});

describe("ProportionalAllocationStrategy", () => {
  it("splits a fixed quote across equal accounts without losing the residual", () => {
    const result = strategy.plan(
      [target("one", 1000), target("two", 1000), target("three", 1000)],
      { mode: "fixed_quote", totalQuoteAmount: "1000" },
    );

    const values = [...result.values()];
    const total = values.reduce(
      (sum, value) => sum.add(value),
      Money.zero("USDT"),
    );
    assert.equal(total.toString(), "1000");
    assert.equal(values[0]?.toString(), "333.333333333333333333");
    assert.equal(values[2]?.toString(), "333.333333333333333334");
  });

  it("weights a fixed quote by account equity", () => {
    const result = strategy.plan(
      [target("small", 1000), target("large", 3000)],
      { mode: "fixed_quote", totalQuoteAmount: "800" },
    );

    assert.equal(result.get("small")?.toString(), "200");
    assert.equal(result.get("large")?.toString(), "600");
  });

  it("applies the same equity percentage to each account", () => {
    const result = strategy.plan(
      [target("one", 1000), target("two", 2000)],
      { mode: "equity_percentage", percentage: 10 },
    );

    assert.equal(result.get("one")?.toString(), "100");
    assert.equal(result.get("two")?.toString(), "200");
  });
});
