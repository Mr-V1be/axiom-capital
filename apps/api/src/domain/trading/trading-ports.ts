import { InvestorAccount } from "../accounts/investor-account.js";
import { Money } from "../shared/money.js";
import { OrderBatch } from "./order.js";

export interface AllocationStrategy {
  allocate(equity: Money, percentage: number): Money;
}

export class ProportionalAllocationStrategy implements AllocationStrategy {
  allocate(equity: Money, percentage: number): Money {
    if (percentage <= 0 || percentage > 100) {
      throw new Error("Allocation percentage must be within (0, 100]");
    }
    return equity.percentage(percentage);
  }
}

export interface RiskDecision {
  allowed: boolean;
  reason?: string;
  policy?: string;
}

export interface RiskContext {
  account: InvestorAccount;
  equity: Money;
  allocation: Money;
  allocationPercent: number;
  symbol: string;
  dailyPnl: Money;
  openPositions: number;
}

export interface RiskPolicy {
  evaluate(context: RiskContext): Promise<RiskDecision>;
}

export interface OrderRepository {
  findByIdempotencyKey(
    tenantId: string,
    key: string,
  ): Promise<OrderBatch | null>;
  reserve(batch: OrderBatch): Promise<OrderBatch>;
  update(batch: OrderBatch): Promise<void>;
}

export interface ExecutionScheduler {
  map<T, R>(
    items: readonly T[],
    task: (item: T) => Promise<R>,
  ): Promise<R[]>;
}
