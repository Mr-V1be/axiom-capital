import { PlaceBatchOrderInput } from "@axiom/contracts";
import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import { ExchangeGatewayFactory } from "../../domain/exchange/exchange-gateway.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { Order, OrderBatch } from "../../domain/trading/order.js";
import {
  AllocationStrategy,
  ExecutionScheduler,
  OrderRepository,
  RiskPolicy,
} from "../../domain/trading/trading-ports.js";
import { AuditWriter, RequestContext, SecretCipher } from "../shared/context.js";

export class PlaceBatchOrder {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
    private readonly orders: OrderRepository,
    private readonly exchanges: ExchangeGatewayFactory,
    private readonly allocation: AllocationStrategy,
    private readonly risk: RiskPolicy,
    private readonly scheduler: ExecutionScheduler,
    private readonly cipher: SecretCipher,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext, input: PlaceBatchOrderInput) {
    const existing = await this.orders.findByIdempotencyKey(
      context.tenantId,
      input.idempotencyKey,
    );
    if (existing) return existing.snapshot();

    const batchId = this.ids.next();
    const prepared = await this.scheduler.map(input.accountIds, async (accountId) => {
      const account = await this.accounts.findById(context.tenantId, accountId);
      if (!account) throw new NotFoundError("InvestorAccount", accountId);
      const balance = await this.balances.latest(accountId);
      if (!balance) throw new NotFoundError("BalanceSnapshot", accountId);

      const allocated = this.allocation.allocate(
        balance.equity,
        input.allocationPercent,
      );
      const order = Order.pending({
        id: this.ids.next(),
        batchId,
        accountId,
        allocated,
      });
      const decision = await this.risk.evaluate({
        account,
        equity: balance.equity,
        allocation: allocated,
        allocationPercent: input.allocationPercent,
        symbol: input.symbol,
        dailyPnl: balance.pnlToday,
        openPositions: 0,
      });
      if (!decision.allowed) {
        order.reject(decision.reason ?? "Risk policy rejected the order");
      }
      return { account, order };
    });

    const batch = OrderBatch.create({
      id: batchId,
      tenantId: context.tenantId,
      idempotencyKey: input.idempotencyKey,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      allocationPercent: input.allocationPercent,
      submittedAt: this.clock.now(),
      orders: prepared.map((item) => item.order),
    });
    const reservation = await this.orders.reserve(batch);
    if (reservation.snapshot().id !== batchId) return reservation.snapshot();

    await this.scheduler.map(
      prepared.filter((item) => item.order.snapshot().status === "pending"),
      async ({ account, order }) => {
        try {
          const state = account.snapshot();
          const [apiKey, secret] = await Promise.all([
            this.cipher.decrypt(state.encryptedKey),
            this.cipher.decrypt(state.encryptedSecret),
          ]);
          const result = await this.exchanges.for(state.exchange).placeOrder(
            { apiKey, secret },
            {
              symbol: input.symbol,
              side: input.side,
              type: input.type,
              quoteAmount: order.snapshot().allocated.toString(),
              ...(input.limitPrice ? { limitPrice: input.limitPrice } : {}),
              clientOrderId: order.snapshot().id,
            },
          );
          order.accept(result.orderId, result.status === "filled");
        } catch (error) {
          order.fail(
            error instanceof Error ? error.message : "Unknown exchange error",
          );
        }
      },
    );
    await this.orders.update(batch);
    await this.audit.write({
      context,
      action: "orders.batch_submitted",
      aggregateType: "OrderBatch",
      aggregateId: batchId,
      payload: { symbol: input.symbol, accountCount: input.accountIds.length },
    });
    return batch.snapshot();
  }
}
