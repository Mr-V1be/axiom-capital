import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvestorAccount } from "../accounts/investor-account.js";
import { Money } from "../shared/money.js";
import { AccountRiskPolicy, RiskProfileRepository } from "./risk-profile.js";

const profiles: RiskProfileRepository = {
  async get(accountId) {
    return {
      accountId,
      maxAllocationPercent: 10,
      maxDailyLossPercent: 3,
      maxOpenPositions: 5,
      allowedSymbols: ["BTC/USDT"],
      tradingEnabled: true,
    };
  },
  async getMany() {
    return new Map();
  },
  async createDefaults() {},
  async updateMaxAllocation(accountId, maxAllocationPercent) {
    return {
      ...(await this.get(accountId)),
      maxAllocationPercent,
    };
  },
};

const account = InvestorAccount.create({
  id: "account_00000000000001",
  tenantId: "tenant_000000000000001",
  label: "Main",
  investorName: "Investor",
  exchange: "mexc",
  accountScope: "standalone",
  marketType: "spot",
  accessMode: "trade",
  status: "connected",
  encryptedKey: "key",
  encryptedSecret: "secret",
  createdAt: new Date(),
});

describe("AccountRiskPolicy", () => {
  it("rejects allocation above the account limit", async () => {
    const result = await new AccountRiskPolicy(profiles).evaluate({
      account,
      equity: Money.of(10_000, "USDT"),
      allocation: Money.of(1_100, "USDT"),
      allocationPercent: 11,
      symbol: "BTC/USDT",
      dailyPnl: Money.of(20, "USDT"),
      openPositions: 0,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.policy, "ALLOCATION_LIMIT");
  });

  it("rejects trading after the daily loss limit", async () => {
    const result = await new AccountRiskPolicy(profiles).evaluate({
      account,
      equity: Money.of(10_000, "USDT"),
      allocation: Money.of(1_000, "USDT"),
      allocationPercent: 10,
      symbol: "BTC/USDT",
      dailyPnl: Money.of(-300, "USDT"),
      openPositions: 0,
    });

    assert.equal(result.allowed, false);
    assert.equal(result.policy, "DAILY_LOSS_LIMIT");
  });
});
