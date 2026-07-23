import { Money } from "../shared/money.js";

export type OrderStatus =
  | "pending"
  | "accepted"
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
  exchangeOrderId?: string;
  failureReason?: string;
}

export class Order {
  private constructor(private state: OrderState) {}

  static pending(state: Omit<OrderState, "status">): Order {
    return new Order({ ...state, status: "pending" });
  }

  accept(exchangeOrderId: string, filled: boolean): void {
    this.state = {
      ...this.state,
      exchangeOrderId,
      status: filled ? "filled" : "accepted",
    };
  }

  reject(reason: string): void {
    this.state = { ...this.state, status: "rejected", failureReason: reason };
  }

  fail(reason: string): void {
    this.state = { ...this.state, status: "failed", failureReason: reason };
  }

  snapshot(): Readonly<OrderState> {
    return Object.freeze({ ...this.state });
  }
}

export interface OrderBatchState {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  allocationPercent: number;
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
