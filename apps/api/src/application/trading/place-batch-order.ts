import { PlaceBatchOrderInput } from "@axiom/contracts";
import { Decimal } from "decimal.js";
import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import {
  NotFoundError,
  PolicyViolationError,
} from "../../domain/shared/domain-error.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import { Order, OrderBatch } from "../../domain/trading/order.js";
import {
  AllocationStrategy,
  ExecutionScheduler,
  OrderRepository,
  RiskPolicy,
} from "../../domain/trading/trading-ports.js";
import { AuditWriter, RequestContext } from "../shared/context.js";
import { OrderExecutionAccess } from "./order-execution-access.js";

export class PlaceBatchOrder {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
    private readonly orders: OrderRepository,
    private readonly access: OrderExecutionAccess,
    private readonly allocation: AllocationStrategy,
    private readonly risk: RiskPolicy,
    private readonly scheduler: ExecutionScheduler,
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
    const loaded = await this.scheduler.map(input.accountIds, async (accountId) => {
      const account = await this.accounts.findById(context.tenantId, accountId);
      if (!account) throw new NotFoundError("InvestorAccount", accountId);
      const balance = await this.balances.latest(accountId);
      if (!balance) throw new NotFoundError("BalanceSnapshot", accountId);
      return { account, balance };
    });
    this.assertCompatibleAccounts(loaded, input);

    const allocationRequest = input.allocationMode === "fixed_quote"
      ? { mode: "fixed_quote" as const, totalQuoteAmount: input.totalQuoteAmount }
      : { mode: "equity_percentage" as const, percentage: input.allocationPercent };
    const plan = this.allocation.plan(
      loaded.map(({ account, balance }) => ({
        accountId: account.snapshot().id,
        equity: balance.equity,
      })),
      allocationRequest,
    );
    const prepared = await this.scheduler.map(loaded, async ({ account, balance }) => {
      const accountId = account.snapshot().id;
      const allocated = plan.get(accountId);
      if (!allocated) throw new Error(`Missing allocation for ${accountId}`);
      const allocationPercent = new Decimal(allocated.toString())
        .dividedBy(balance.equity.toString())
        .times(100)
        .toNumber();
      const order = Order.pending({
        id: this.ids.next(),
        batchId,
        accountId: account.snapshot().id,
        allocated,
      });
      const { gateway, credentials } = await this.access.forAccount(
        context.tenantId,
        accountId,
      );
      const openPositions = await gateway.fetchOpenPositions(credentials);
      const decision = await this.risk.evaluate({
        account,
        equity: balance.equity,
        allocation: allocated,
        allocationPercent,
        symbol: input.symbol,
        dailyPnl: balance.pnlToday,
        openPositions,
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
      allocationMode: input.allocationMode,
      allocationPercent: this.portfolioAllocationPercent(loaded, plan),
      ...(input.allocationMode === "fixed_quote"
        ? {
            requestedQuoteAmount: [...plan.values()].reduce(
              (sum, amount) => sum.add(amount),
              Money.zero(loaded[0]!.balance.equity.currency),
            ),
          }
        : {}),
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
          const { gateway, credentials } = await this.access.forAccount(
            context.tenantId,
            state.id,
          );
          const result = await gateway.placeOrder(
            credentials,
            {
              symbol: input.symbol,
              side: input.side,
              type: input.type,
              quoteAmount: order.snapshot().allocated.toString(),
              ...(input.limitPrice ? { limitPrice: input.limitPrice } : {}),
              ...(input.leverage ? { leverage: input.leverage } : {}),
              ...(input.marginMode ? { marginMode: input.marginMode } : {}),
              ...(input.reduceOnly !== undefined
                ? { reduceOnly: input.reduceOnly }
                : {}),
              clientOrderId: order.snapshot().id,
            },
          );
          order.applyExecution({
            exchangeOrderId: result.orderId,
            status: result.status,
            filled: Money.of(result.filledQuote, order.snapshot().allocated.currency),
            remaining: Money.of(
              result.remainingQuote,
              order.snapshot().allocated.currency,
            ),
            ...(result.averagePrice
              ? { averagePrice: result.averagePrice }
              : {}),
            syncedAt: this.clock.now(),
          });
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

  private assertCompatibleAccounts(
    loaded: ReadonlyArray<{
      account: { snapshot(): { marketType: "spot" | "swap" } };
    }>,
    input: PlaceBatchOrderInput,
  ): void {
    const marketTypes = new Set(
      loaded.map(({ account }) => account.snapshot().marketType),
    );
    if (marketTypes.size !== 1) {
      throw new PolicyViolationError(
        "A batch cannot mix spot and swap accounts",
        "market_consistency",
      );
    }
    if (marketTypes.has("spot") && (
      input.leverage !== undefined ||
      input.marginMode !== undefined ||
      input.reduceOnly !== undefined
    )) {
      throw new PolicyViolationError(
        "Leverage, margin mode and reduce-only require swap accounts",
        "market_parameters",
      );
    }
  }

  private portfolioAllocationPercent(
    loaded: ReadonlyArray<{ balance: { equity: { toString(): string } } }>,
    plan: ReadonlyMap<string, { toString(): string }>,
  ): number {
    const equity = loaded.reduce<Decimal>(
      (sum, item) => sum.plus(item.balance.equity.toString()),
      new Decimal(0),
    );
    const allocated = [...plan.values()].reduce<Decimal>(
      (sum, amount) => sum.plus(amount.toString()),
      new Decimal(0),
    );
    return allocated.dividedBy(equity).times(100).toNumber();
  }
}
