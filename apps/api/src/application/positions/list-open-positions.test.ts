import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import { ExchangeGateway } from "../../domain/exchange/exchange-gateway.js";
import { TaskScheduler } from "../../domain/shared/task-scheduler.js";
import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { ListOpenPositions } from "./list-open-positions.js";

const tenantId = "tenant_000000000000001";

describe("ListOpenPositions", () => {
  it("isolates account failures and enriches available positions", async () => {
    const available = account("account_00000000000001", "Futures A");
    const unavailable = account("account_00000000000002", "Futures B");
    const accounts: AccountRepository = {
      async findById() { return null; },
      async existsByLabel() { return false; },
      async save() {},
      async list() { return { items: [available, unavailable] }; },
    };
    const connection = {
      async forAccount(_tenant: string, accountId: string) {
        if (accountId === unavailable.snapshot().id) {
          throw new Error("MEXC timeout");
        }
        return {
          credentials: { apiKey: "key", secret: "secret", marketType: "swap" },
          gateway: {
            async fetchPositions() {
              return [{
                id: "position-1",
                symbol: "BTC/USDT:USDT",
                side: "long",
                contracts: "1",
                contractSize: "0.0001",
                baseAmount: "0.0001",
                entryPrice: "64000",
                currentPrice: "64500",
                liquidationPrice: "15000",
                leverage: "20",
                marginMode: "cross",
                notional: "6.45",
                initialMargin: "0.33",
                unrealizedPnl: "0.05",
                realizedPnl: "0",
                roePercent: "15",
                marginRatioPercent: "0.2",
                openedAt: null,
                updatedAt: new Date("2026-07-26T20:00:00Z"),
              }];
            },
          } as unknown as ExchangeGateway,
        };
      },
    } as unknown as AccountConnectionAccess;
    const scheduler: TaskScheduler = {
      async map(items, task) {
        return Promise.all(items.map(task));
      },
    };
    const useCase = new ListOpenPositions(
      accounts,
      connection,
      scheduler,
      { now: () => new Date("2026-07-26T20:00:05Z") },
    );

    const result = await useCase.execute({
      tenantId,
      actorId: "owner",
      requestId: "request",
    });

    assert.equal(result.items.length, 1);
    assert.equal(result.items[0]?.accountLabel, "Futures A");
    assert.equal(result.failures.length, 1);
    assert.equal(result.failures[0]?.accountLabel, "Futures B");
  });
});

function account(id: string, label: string) {
  return InvestorAccount.create({
    id,
    tenantId,
    label,
    investorName: "Evgeni",
    exchange: "mexc",
    accountScope: "standalone",
    marketType: "swap",
    accessMode: "trade",
    status: "connected",
    encryptedKey: "key",
    encryptedSecret: "secret",
    createdAt: new Date("2026-07-26T00:00:00Z"),
  });
}
