import { InvestorAccount } from "../accounts/investor-account.js";
import { Money } from "../shared/money.js";
import { OrderBatch } from "./order.js";
export { TaskScheduler as ExecutionScheduler } from "../shared/task-scheduler.js";

export interface AllocationTarget {
  accountId: string;
  equity: Money;
}

export type AllocationRequest =
  | { mode: "equity_percentage"; percentage: number }
  | { mode: "fixed_quote"; totalQuoteAmount: string };

export interface AllocationStrategy {
  plan(
    targets: readonly AllocationTarget[],
    request: AllocationRequest,
  ): ReadonlyMap<string, Money>;
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
  findById(tenantId: string, id: string): Promise<OrderBatch | null>;
  findByIdempotencyKey(
    tenantId: string,
    key: string,
  ): Promise<OrderBatch | null>;
  reserve(batch: OrderBatch): Promise<OrderBatch>;
  update(batch: OrderBatch): Promise<void>;
}
