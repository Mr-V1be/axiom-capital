import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import {
  ExchangeGateway,
  ExchangeGatewayFactory,
} from "../../domain/exchange/exchange-gateway.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import { ProportionalAllocationStrategy } from "../../domain/trading/allocation-plan.js";
import { OrderBatch } from "../../domain/trading/order.js";
import {
  ExecutionScheduler,
  OrderRepository,
  RiskPolicy,
} from "../../domain/trading/trading-ports.js";
import { AuditWriter, SecretCipher } from "../shared/context.js";
import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { OrderExecutionAccess } from "./order-execution-access.js";
import { PlaceBatchOrder } from "./place-batch-order.js";

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
  encryptedKey: "encrypted-key",
  encryptedSecret: "encrypted-secret",
  createdAt: new Date("2026-07-01T00:00:00Z"),
});

class SequenceIds implements IdGenerator {
  private value = 0;
  next(): string {
    return `generated_${String(++this.value).padStart(15, "0")}`;
  }
}

function fixture(existing: OrderBatch | null = null, equity = "10000") {
  let reserved = false;
  let exchangeCalls = 0;
  const accounts: AccountRepository = {
    async findById(_tenantId, id) {
      return id === account.snapshot().id ? account : null;
    },
    async existsByLabel() { return false; },
    async save() {},
    async list() { return { items: [account] }; },
  };
  const balances: BalanceRepository = {
    async latest(accountId) {
      return {
        accountId,
        equity: Money.of(equity, "USDT"),
        pnlToday: Money.of(100, "USDT"),
        pnlTotal: Money.of(500, "USDT"),
        balances: { USDT: equity },
        capturedAt: new Date(),
      };
    },
    async save() {},
    async equityCurve() { return []; },
  };
  const orders: OrderRepository = {
    async findById() { return existing; },
    async findByIdempotencyKey() { return existing; },
    async reserve(batch) {
      reserved = true;
      return batch;
    },
    async update() {},
  };
  const gateway: ExchangeGateway = {
    async verifyAccess() {},
    async fetchBalance() {
      return { currency: "USDT", equity: "10000", balances: {} };
    },
    async fetchPositions() { return []; },
    async fetchActivity() {
      return { openOrders: [], recentOrders: [], recentTrades: [] };
    },
    async fetchOpenPositions() { return 0; },
    async fetchAccountDetails() {
      throw new Error("Account details are not used in order placement tests");
    },
    async fetchMarketQuote() {
      throw new Error("Market quote is not used in order placement tests");
    },
    async placeOrder() {
      assert.equal(reserved, true, "batch must be reserved before execution");
      exchangeCalls += 1;
      return {
        orderId: "mexc-order-1",
        status: "accepted",
        filledQuote: "0",
        remainingQuote: "500",
      };
    },
    async fetchOrder() {
      return {
        orderId: "mexc-order-1",
        status: "accepted",
        filledQuote: "0",
        remainingQuote: "500",
      };
    },
    async cancelOrder() {
      return {
        orderId: "mexc-order-1",
        status: "cancelled",
        filledQuote: "0",
        remainingQuote: "500",
      };
    },
    async executePositionAction() {
      throw new Error("Not used");
    },
  };
  const factory: ExchangeGatewayFactory = { for: () => gateway };
  const risk: RiskPolicy = { async evaluate() { return { allowed: true }; } };
  const scheduler: ExecutionScheduler = {
    async map(items, task) {
      const results = [];
      for (const item of items) results.push(await task(item));
      return results;
    },
  };
  const cipher: SecretCipher = {
    async encrypt(value) { return value; },
    async decrypt() { return "plain-secret"; },
  };
  const audit: AuditWriter = { async write() {} };
  const clock: Clock = { now: () => new Date("2026-07-23T00:00:00Z") };
  const useCase = new PlaceBatchOrder(
    accounts,
    balances,
    orders,
    new OrderExecutionAccess(new AccountConnectionAccess(accounts, factory, cipher)),
    new ProportionalAllocationStrategy(),
    risk,
    scheduler,
    audit,
    new SequenceIds(),
    clock,
  );
  return {
    useCase,
    wasReserved: () => reserved,
    exchangeCalls: () => exchangeCalls,
  };
}

const input = {
  idempotencyKey: "idempotency_0000000001",
  accountIds: [account.snapshot().id],
  symbol: "BTC/USDT",
  side: "buy" as const,
  type: "market" as const,
  allocationMode: "equity_percentage" as const,
  allocationPercent: 5,
};

const context = {
  tenantId: "tenant_000000000000001",
  actorId: "user_00000000000000001",
  requestId: "request_000000000000001",
};

describe("PlaceBatchOrder", () => {
  it("reserves a batch before sending any order to an exchange", async () => {
    const test = fixture();
    const result = await test.useCase.execute(context, input);

    assert.equal(test.wasReserved(), true);
    assert.equal(test.exchangeCalls(), 1);
    assert.equal(result.orders[0]?.snapshot().status, "accepted");
  });

  it("returns an idempotent result without repeating execution", async () => {
    const first = fixture();
    const existing = OrderBatch.create(
      await first.useCase.execute(context, input),
    );
    const retry = fixture(existing);

    const result = await retry.useCase.execute(context, input);
    assert.equal(result.id, existing.snapshot().id);
    assert.equal(retry.exchangeCalls(), 0);
    assert.equal(retry.wasReserved(), false);
  });

  it("blocks zero-equity accounts before reserving or executing", async () => {
    const test = fixture(null, "0");

    await assert.rejects(
      test.useCase.execute(context, input),
      /positive equity/,
    );
    assert.equal(test.wasReserved(), false);
    assert.equal(test.exchangeCalls(), 0);
  });
});
