import { NotFoundError } from "../../domain/shared/domain-error.js";
import { Clock } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import {
  ExecutionScheduler,
  OrderRepository,
} from "../../domain/trading/trading-ports.js";
import { AuditWriter, RequestContext } from "../shared/context.js";
import { OrderExecutionAccess } from "./order-execution-access.js";

export class SyncBatchOrders {
  constructor(
    private readonly orders: OrderRepository,
    private readonly access: OrderExecutionAccess,
    private readonly scheduler: ExecutionScheduler,
    private readonly audit: AuditWriter,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext, batchId: string) {
    const batch = await this.orders.findById(context.tenantId, batchId);
    if (!batch) throw new NotFoundError("OrderBatch", batchId);
    const state = batch.snapshot();
    const openOrders = state.orders.filter((order) => order.isOpen());

    await this.scheduler.map(openOrders, async (order) => {
      const current = order.snapshot();
      if (!current.exchangeOrderId) return;
      try {
        const { gateway, credentials } = await this.access.forAccount(
          context.tenantId,
          current.accountId,
        );
        const result = await gateway.fetchOrder(credentials, {
          orderId: current.exchangeOrderId,
          symbol: state.symbol,
        });
        order.applyExecution({
          exchangeOrderId: result.orderId,
          status: result.status,
          filled: Money.of(result.filledQuote, current.allocated.currency),
          remaining: Money.of(result.remainingQuote, current.allocated.currency),
          ...(result.averagePrice
            ? { averagePrice: result.averagePrice }
            : {}),
          syncedAt: this.clock.now(),
        });
      } catch (error) {
        order.recordFailure(
          error instanceof Error ? error.message : "Order synchronization failed",
        );
      }
    });
    await this.orders.update(batch);
    await this.audit.write({
      context,
      action: "orders.batch_synchronized",
      aggregateType: "OrderBatch",
      aggregateId: batchId,
      payload: { synchronizedCount: openOrders.length },
    });
    return batch.snapshot();
  }
}
