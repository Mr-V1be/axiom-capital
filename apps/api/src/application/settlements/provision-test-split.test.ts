import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import { SplitConfigurationState } from "../../domain/settlements/settlement-ports.js";
import { ProvisionTestSplit } from "./provision-test-split.js";

const context = {
  tenantId: "tenant_000000000000001",
  actorId: "user_00000000000000001",
  requestId: "request_000000000000001",
};

const account = InvestorAccount.create({
  id: "account_00000000000001",
  tenantId: context.tenantId,
  label: "Main",
  investorName: "Investor",
  exchange: "mexc",
  accountScope: "standalone",
  marketType: "spot",
  accessMode: "trade",
  status: "connected",
  encryptedKey: "key",
  encryptedSecret: "secret",
  createdAt: new Date("2026-07-26T00:00:00Z"),
});

describe("ProvisionTestSplit", () => {
  it("provisions, verifies and persists an immutable test Split", async () => {
    let saved: SplitConfigurationState | null = null;
    let audited = false;
    let provisions = 0;
    const useCase = new ProvisionTestSplit(
      {
        async findById() { return account; },
        async existsByLabel() { return false; },
        async save() {},
        async list() { return { items: [account] }; },
      },
      {
        async findByAccount() { return saved; },
        async listByTenant() { return []; },
        async getVerifiedConfiguration() { return null; },
        async save(value) { saved = value; },
      },
      {
        async status() {
          return {
            mode: "test_fork",
            connected: true,
            factoryDeployed: true,
          };
        },
        async provision(input) {
          provisions += 1;
          return {
            chainId: 84532,
            networkName: "Base Sepolia Fork",
            environment: "testnet",
            address: "0x1111111111111111111111111111111111111111",
            investorAddress: "0x2222222222222222222222222222222222222222",
            traderAddress: "0x3333333333333333333333333333333333333333",
            traderSharePercent: input.traderSharePercent,
            splitType: "push",
            protocolVersion: "splitV2o2",
            deploymentTxHash: `0x${"4".repeat(64)}`,
            verifiedAt: new Date("2026-07-26T00:01:00Z"),
          };
        },
      },
      { async write() { audited = true; } },
      { next: () => "split_config_000000001" },
      { now: () => new Date("2026-07-26T00:02:00Z") },
    );

    const result = await useCase.execute(context, {
      accountId: account.snapshot().id,
      traderSharePercent: 20,
    });

    assert.equal(result.traderSharePercent, 20);
    const persisted = saved as SplitConfigurationState | null;
    assert.ok(persisted);
    assert.equal(persisted.address, result.address);
    assert.equal(audited, true);

    const recovered = await useCase.execute(context, {
      accountId: account.snapshot().id,
      traderSharePercent: 10,
    });
    assert.equal(recovered.traderSharePercent, 20);
    assert.equal(recovered.id, result.id);
    assert.equal(provisions, 2);
  });
});
