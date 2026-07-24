import { Money } from "../shared/money.js";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "partially_filled"
  | "rejected"
  | "failed"
  | "filled"
  | "cancelled";

export interface OrderState {
  id: string;
  batchId: string;
  accountId: string;
  status: OrderStatus;
  allocated: Money;
  filled: Money;
  remaining: Money;
  exchangeOrderId?: string;
  averagePrice?: string;
  lastSyncedAt?: Date;
  failureReason?: string;
}

export class Order {
  private constructor(private state: OrderState) {}

  static pending(
    state: Omit<OrderState, "status" | "filled" | "remaining">,
  ): Order {
    return new Order({
      ...state,
      status: "pending",
      filled: Money.zero(state.allocated.currency),
      remaining: state.allocated,
    });
  }

  applyExecution(execution: {
    exchangeOrderId: string;
    status: "accepted" | "partially_filled" | "filled" | "cancelled";
    filled: Money;
    remaining: Money;
    averagePrice?: string;
    syncedAt: Date;
  }): void {
    this.assertSameCurrency(execution.filled, execution.remaining);
    if (execution.filled.isNegative() || execution.remaining.isNegative()) {
      throw new Error("Execution amounts cannot be negative");
    }
    if (execution.filled.add(execution.remaining).compare(this.state.allocated) > 0) {
      throw new Error("Execution amounts cannot exceed allocated amount");
    }
    const { failureReason: _, ...current } = this.state;
    this.state = {
      ...current,
      exchangeOrderId: execution.exchangeOrderId,
      status: execution.status,
      filled: execution.filled,
      remaining: execution.remaining,
      lastSyncedAt: execution.syncedAt,
      ...(execution.averagePrice
        ? { averagePrice: execution.averagePrice }
        : {}),
    };
  }

  reject(reason: string): void {
    this.state = { ...this.state, status: "rejected", failureReason: reason };
  }

  fail(reason: string): void {
    this.state = { ...this.state, status: "failed", failureReason: reason };
  }

  recordFailure(reason: string): void {
    this.state = { ...this.state, failureReason: reason };
  }

  isOpen(): boolean {
    return ["pending", "accepted", "partially_filled"].includes(this.state.status);
  }

  snapshot(): Readonly<OrderState> {
    return Object.freeze({ ...this.state });
  }

  private assertSameCurrency(filled: Money, remaining: Money): void {
    if (
      filled.currency !== this.state.allocated.currency ||
      remaining.currency !== this.state.allocated.currency
    ) {
      throw new Error("Execution currency must match allocated currency");
    }
  }
}

export interface OrderBatchState {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  allocationMode: "equity_percentage" | "fixed_quote";
  allocationPercent: number;
  requestedQuoteAmount?: Money;
  submittedAt: Date;
  orders: Order[];
}

export class OrderBatch {
  private constructor(private readonly state: OrderBatchState) {}

  static create(state: OrderBatchState): OrderBatch {
    return new OrderBatch(state);
  }

  snapshot(): Readonly<OrderBatchState> {
    return Object.freeze({ ...this.state, orders: [...this.state.orders] });
  }
}
