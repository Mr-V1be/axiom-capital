import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AccountAccessUpdater,
  AccountRepository,
} from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import {
  ExchangeGateway,
  ExchangeGatewayFactory,
} from "../../domain/exchange/exchange-gateway.js";
import { AccountConnectionAccess } from "./account-connection-access.js";
import { UpdateAccountAccess } from "./update-account-access.js";

function fixture(verificationError?: Error) {
  const account = InvestorAccount.create({
    id: "account_00000000000001",
    tenantId: "tenant_000000000000001",
    label: "Main Spot",
    investorName: "Investor",
    exchange: "mexc",
    accountScope: "standalone",
    marketType: "spot",
    accessMode: "read_only",
    status: "connected",
    encryptedKey: "encrypted-key",
    encryptedSecret: "encrypted-secret",
    createdAt: new Date("2026-07-25T00:00:00Z"),
  });
  let updates = 0;
  const accounts: AccountRepository = {
    async findById() { return account; },
    async existsByLabel() { return false; },
    async save() {},
    async list() { return { items: [account] }; },
  };
  const gateway = {
    async verifyAccess() {
      if (verificationError) throw verificationError;
    },
  } as unknown as ExchangeGateway;
  const exchanges: ExchangeGatewayFactory = { for: () => gateway };
  const updater: AccountAccessUpdater = {
    async updateAccess() { updates += 1; },
  };
  const access = new AccountConnectionAccess(accounts, exchanges, {
    async encrypt(value) { return value; },
    async decrypt(value) { return value; },
  });
  const useCase = new UpdateAccountAccess(access, updater, {
    async write() {},
  });
  return { account, updates: () => updates, useCase };
}

const context = {
  tenantId: "tenant_000000000000001",
  actorId: "user_00000000000000001",
  requestId: "request_000000000000001",
};

describe("UpdateAccountAccess", () => {
  it("enables trading only after exchange verification", async () => {
    const test = fixture();
    const state = await test.useCase.execute(
      context,
      test.account.snapshot().id,
      { accessMode: "trade" },
    );

    assert.equal(state.accessMode, "trade");
    assert.equal(test.updates(), 1);
  });

  it("keeps read-only mode when exchange verification fails", async () => {
    const test = fixture(new Error("Trading permission is required"));

    await assert.rejects(
      test.useCase.execute(context, test.account.snapshot().id, {
        accessMode: "trade",
      }),
    );
    assert.equal(test.account.snapshot().accessMode, "read_only");
    assert.equal(test.updates(), 0);
  });
});
