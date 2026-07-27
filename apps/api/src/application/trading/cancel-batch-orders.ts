import { CancelBatchOrderInput } from "@axiom/contracts";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { Clock } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import {
  ExecutionScheduler,
  OrderRepository,
} from "../../domain/trading/trading-ports.js";
import { AuditWriter, RequestContext } from "../shared/context.js";
import { OrderExecutionAccess } from "./order-execution-access.js";

export class CancelBatchOrders {
  constructor(
    private readonly orders: OrderRepository,
    private readonly access: OrderExecutionAccess,
    private readonly scheduler: ExecutionScheduler,
    private readonly audit: AuditWriter,
    private readonly clock: Clock,
  ) {}

  async execute(
    context: RequestContext,
    batchId: string,
    input: CancelBatchOrderInput,
  ) {
    const batch = await this.orders.findById(context.tenantId, batchId);
    if (!batch) throw new NotFoundError("OrderBatch", batchId);
    const state = batch.snapshot();
    const selected = input.accountIds ? new Set(input.accountIds) : null;
    const cancellable = state.orders.filter((order) => {
      const item = order.snapshot();
      return order.isOpen() && (!selected || selected.has(item.accountId));
    });

    await this.scheduler.map(cancellable, async (order) => {
      const current = order.snapshot();
      if (!current.exchangeOrderId) return;
      try {
        const { gateway, credentials } = await this.access.forAccount(
          context.tenantId,
          current.accountId,
        );
        await gateway.cancelOrder(credentials, {
          orderId: current.exchangeOrderId,
          symbol: state.symbol,
        });
        order.applyExecution({
          exchangeOrderId: current.exchangeOrderId,
          status: "cancelled",
          filled: current.filled,
          remaining: Money.zero(current.allocated.currency),
          ...(current.averagePrice
            ? { averagePrice: current.averagePrice }
            : {}),
          syncedAt: this.clock.now(),
        });
      } catch (error) {
        order.recordFailure(
          error instanceof Error ? error.message : "Order cancellation failed",
        );
      }
    });
    await this.orders.update(batch);
    await this.audit.write({
      context,
      action: "orders.batch_cancel_requested",
      aggregateType: "OrderBatch",
      aggregateId: batchId,
      payload: { requestedCount: cancellable.length },
    });
    return batch.snapshot();
  }
}
