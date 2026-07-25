import assert from "node:assert/strict";
import { it } from "node:test";
import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { OrderExecutionAccess } from "./order-execution-access.js";

it("blocks exchange execution for a read-only account", async () => {
  const account = InvestorAccount.create({
    id: "account_read_only_00001",
    tenantId: "tenant_000000000000001",
    label: "Read only",
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
  const accounts: AccountRepository = {
    async findById() { return account; },
    async existsByLabel() { return false; },
    async save() {},
    async list() { return { items: [account] }; },
  };
  const connection = new AccountConnectionAccess(
    accounts,
    { for: () => { throw new Error("Gateway must not be requested"); } },
    {
      async encrypt(value) { return value; },
      async decrypt(value) { return value; },
    },
  );

  await assert.rejects(
    new OrderExecutionAccess(connection).forAccount(
      account.snapshot().tenantId,
      account.snapshot().id,
    ),
    (error: unknown) =>
      error instanceof Error &&
      "policy" in error &&
      error.policy === "account_access_mode",
  );
});
