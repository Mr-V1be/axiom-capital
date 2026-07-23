import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Money } from "../shared/money.js";
import { Settlement } from "./settlement.js";

describe("Settlement", () => {
  const base = {
    id: "settlement_000000000001",
    tenantId: "tenant_000000000000001",
    accountId: "account_00000000000001",
    investorName: "Vladislav",
    periodStart: new Date("2026-07-01T00:00:00Z"),
    periodEnd: new Date("2026-07-31T00:00:00Z"),
    currentEquity: Money.of("11200", "USDT"),
    previousHighWaterMark: Money.of("10000", "USDT"),
    traderSharePercent: 20,
    createdAt: new Date("2026-07-31T00:01:00Z"),
  };

  it("charges performance fee only above the high-water mark", () => {
    const state = Settlement.calculate(base).snapshot();

    assert.equal(state.grossProfit.toString(), "1200");
    assert.equal(state.traderShare.toString(), "240");
    assert.equal(state.investorShare.toString(), "960");
    assert.equal(state.highWaterMark.toString(), "11200");
  });

  it("refuses a fee when the high-water mark was not exceeded", () => {
    assert.throws(
      () =>
        Settlement.calculate({
          ...base,
          currentEquity: Money.of("9900", "USDT"),
        }),
      /No profit above/,
    );
  });
});
