import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import {
  ExchangeGateway,
  ExchangeGatewayFactory,
} from "../../domain/exchange/exchange-gateway.js";
import { Money } from "../../domain/shared/money.js";
import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { Order, OrderBatch } from "../../domain/trading/order.js";
import {
  ExecutionScheduler,
  OrderRepository,
} from "../../domain/trading/trading-ports.js";
import { CancelBatchOrders } from "./cancel-batch-orders.js";
import { OrderExecutionAccess } from "./order-execution-access.js";
import { SyncBatchOrders } from "./sync-batch-orders.js";

const tenantId = "tenant_000000000000001";
const account = InvestorAccount.create({
  id: "account_00000000000001",
  tenantId,
  label: "MEXC subaccount",
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

function openBatch() {
  const order = Order.pending({
    id: "order_0000000000000001",
    batchId: "batch_0000000000000001",
    accountId: account.snapshot().id,
    allocated: Money.of(1_000, "USDT"),
  });
  order.applyExecution({
    exchangeOrderId: "mexc-order-1",
    status: "accepted",
    filled: Money.zero("USDT"),
    remaining: Money.of(1_000, "USDT"),
    syncedAt: new Date("2026-07-24T00:00:00Z"),
  });
  return OrderBatch.create({
    id: "batch_0000000000000001",
    tenantId,
    idempotencyKey: "idempotency_0000000001",
    symbol: "BTC/USDT",
    side: "buy",
    type: "limit",
    allocationMode: "fixed_quote",
    allocationPercent: 10,
    requestedQuoteAmount: Money.of(1_000, "USDT"),
    submittedAt: new Date("2026-07-24T00:00:00Z"),
    orders: [order],
  });
}

function fixture() {
  const batch = openBatch();
  let updates = 0;
  const accounts: AccountRepository = {
    async findById() { return account; },
    async existsByLabel() { return false; },
    async save() {},
    async list() { return { items: [account] }; },
  };
  const orders: OrderRepository = {
    async findById() { return batch; },
    async findByIdempotencyKey() { return null; },
    async reserve(value) { return value; },
    async update() { updates += 1; },
  };
  const gateway: ExchangeGateway = {
    async verifyAccess() {},
    async fetchBalance() {
      return { currency: "USDT", equity: "10000", balances: {} };
    },
    async fetchOpenPositions() { return 0; },
    async fetchAccountDetails() {
      throw new Error("Account details are not used in order lifecycle tests");
    },
    async fetchMarketQuote() {
      throw new Error("Market quote is not used in order lifecycle tests");
    },
    async placeOrder() {
      throw new Error("Not used");
    },
    async fetchOrder() {
      return {
        orderId: "mexc-order-1",
        status: "partially_filled",
        filledQuote: "400",
        remainingQuote: "600",
        averagePrice: "118000",
      };
    },
    async cancelOrder() {
      return {
        orderId: "mexc-order-1",
        status: "cancelled",
        filledQuote: "400",
        remainingQuote: "600",
        averagePrice: "118000",
      };
    },
  };
  const factory: ExchangeGatewayFactory = { for: () => gateway };
  const access = new OrderExecutionAccess(
    new AccountConnectionAccess(accounts, factory, {
      async encrypt(value) { return value; },
      async decrypt(value) { return value; },
    }),
  );
  const scheduler: ExecutionScheduler = {
    async map(items, task) {
      const result = [];
      for (const item of items) result.push(await task(item));
      return result;
    },
  };
  const common = [
    orders,
    access,
    scheduler,
    { async write() {} },
    { now: () => new Date("2026-07-24T01:00:00Z") },
  ] as const;
  return {
    sync: new SyncBatchOrders(...common),
    cancel: new CancelBatchOrders(...common),
    updates: () => updates,
  };
}

const context = {
  tenantId,
  actorId: "user_00000000000000001",
  requestId: "request_000000000000001",
};

describe("Order lifecycle", () => {
  it("synchronizes a partial futures fill", async () => {
    const test = fixture();
    const state = await test.sync.execute(context, "batch_0000000000000001");
    const order = state.orders[0]!.snapshot();

    assert.equal(order.status, "partially_filled");
    assert.equal(order.filled.toString(), "400");
    assert.equal(order.remaining.toString(), "600");
    assert.equal(test.updates(), 1);
  });

  it("cancels the remaining quantity of an open limit order", async () => {
    const test = fixture();
    const state = await test.cancel.execute(
      context,
      "batch_0000000000000001",
      {},
    );

    assert.equal(state.orders[0]!.snapshot().status, "cancelled");
    assert.equal(test.updates(), 1);
  });
});
