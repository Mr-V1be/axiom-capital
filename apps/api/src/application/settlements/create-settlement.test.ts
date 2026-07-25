import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AccountRepository,
  BalanceRepository,
} from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import { PolicyViolationError } from "../../domain/shared/domain-error.js";
import { Money } from "../../domain/shared/money.js";
import {
  SettlementRepository,
  SplitAddressBook,
} from "../../domain/settlements/settlement-ports.js";
import { Settlement } from "../../domain/settlements/settlement.js";
import { CreateSettlement } from "./create-settlement.js";

const account = InvestorAccount.create({
  id: "account_00000000000001",
  tenantId: "tenant_000000000000001",
  label: "Main",
  investorName: "Investor",
  exchange: "mexc",
  accountScope: "subaccount",
  marketType: "swap",
  accessMode: "trade",
  externalAccountId: "investor-main",
  status: "connected",
  encryptedKey: "key",
  encryptedSecret: "secret",
  createdAt: new Date("2026-07-01T00:00:00Z"),
});

function fixture(configuredShare: number) {
  let saved: Settlement | null = null;
  const accounts: AccountRepository = {
    async findById() { return account; },
    async existsByLabel() { return false; },
    async save() {},
    async list() { return { items: [account] }; },
  };
  const balances: BalanceRepository = {
    async latest(accountId) {
      return {
        accountId,
        equity: Money.of(11_000, "USDT"),
        pnlToday: Money.of(100, "USDT"),
        pnlTotal: Money.of(1_000, "USDT"),
        balances: { USDT: "11000" },
        capturedAt: new Date("2026-07-24T00:00:00Z"),
      };
    },
    async save() {},
    async equityCurve() { return []; },
  };
  const settlements: SettlementRepository = {
    async latestAnchor() { return null; },
    async save(value) { saved = value; },
    async list() { return { items: [] }; },
  };
  const splits: SplitAddressBook = {
    async getVerifiedConfiguration() {
      return {
        address: "0x1111111111111111111111111111111111111111",
        chainId: 8453,
        traderSharePercent: configuredShare,
        immutable: true,
        verifiedAt: new Date("2026-07-20T00:00:00Z"),
      };
    },
  };
  const useCase = new CreateSettlement(
    accounts,
    balances,
    settlements,
    splits,
    { async write() {} },
    { next: () => "settlement_000000000001" },
    { now: () => new Date("2026-07-24T00:00:00Z") },
  );
  return { useCase, saved: () => saved };
}

const context = {
  tenantId: "tenant_000000000000001",
  actorId: "user_00000000000000001",
  requestId: "request_000000000000001",
};

describe("CreateSettlement", () => {
  it("uses a matching verified immutable Split configuration", async () => {
    const test = fixture(20);
    const state = await test.useCase.execute(context, {
      accountId: account.snapshot().id,
      periodEnd: "2026-07-24T00:00:00.000Z",
      traderSharePercent: 20,
    });

    assert.equal(state.status, "awaiting_investor");
    assert.equal(state.traderShare.toString(), "200");
    assert.ok(test.saved());
  });

  it("rejects a displayed share that differs from the on-chain split", async () => {
    const test = fixture(30);
    await assert.rejects(
      test.useCase.execute(context, {
        accountId: account.snapshot().id,
        periodEnd: "2026-07-24T00:00:00.000Z",
        traderSharePercent: 20,
      }),
      (error) => error instanceof PolicyViolationError &&
        error.policy === "split_share_consistency",
    );
    assert.equal(test.saved(), null);
  });
});
