import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Money } from "./money.js";

describe("Money", () => {
  it("keeps decimal precision when splitting profit", () => {
    const profit = Money.of("1234.56789123", "USDT");
    const trader = profit.percentage(20);
    const investor = profit.subtract(trader);

    assert.equal(trader.toString(), "246.913578246");
    assert.equal(investor.add(trader).toString(), profit.toString());
  });

  it("rejects arithmetic across currencies", () => {
    assert.throws(
      () => Money.of(1, "USDT").add(Money.of(1, "BTC")),
      /Currency mismatch/,
    );
  });
});
