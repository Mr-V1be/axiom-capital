import { Money } from "../shared/money.js";
import { RiskContext, RiskDecision, RiskPolicy } from "../trading/trading-ports.js";

export interface RiskProfile {
  accountId: string;
  maxAllocationPercent: number;
  maxDailyLossPercent: number;
  maxOpenPositions: number;
  allowedSymbols: readonly string[];
  tradingEnabled: boolean;
}

export interface RiskProfileRepository {
  get(accountId: string): Promise<RiskProfile>;
  createDefaults(accountId: string): Promise<void>;
}

export class AccountRiskPolicy implements RiskPolicy {
  constructor(private readonly profiles: RiskProfileRepository) {}

  async evaluate(context: RiskContext): Promise<RiskDecision> {
    const profile = await this.profiles.get(context.account.snapshot().id);
    if (!profile.tradingEnabled) {
      return this.denied("TRADING_DISABLED", "Trading is disabled");
    }
    if (!profile.allowedSymbols.includes(context.symbol)) {
      return this.denied("SYMBOL_NOT_ALLOWED", `${context.symbol} is not allowed`);
    }
    if (context.allocationPercent > profile.maxAllocationPercent) {
      return this.denied(
        "ALLOCATION_LIMIT",
        `Allocation exceeds ${profile.maxAllocationPercent}%`,
      );
    }
    if (context.openPositions >= profile.maxOpenPositions) {
      return this.denied("POSITION_LIMIT", "Open position limit reached");
    }
    if (context.dailyPnl.isNegative()) {
      const lossLimit = context.equity
        .percentage(profile.maxDailyLossPercent)
        .multiply(-1);
      if (context.dailyPnl.compare(lossLimit) <= 0) {
        return this.denied("DAILY_LOSS_LIMIT", "Daily loss limit reached");
      }
    }
    return { allowed: true };
  }

  private denied(policy: string, reason: string): RiskDecision {
    return { allowed: false, policy, reason };
  }
}

export class CompositeRiskPolicy implements RiskPolicy {
  constructor(private readonly policies: readonly RiskPolicy[]) {}

  async evaluate(context: RiskContext): Promise<RiskDecision> {
    for (const policy of this.policies) {
      const decision = await policy.evaluate(context);
      if (!decision.allowed) return decision;
    }
    return { allowed: true };
  }
}

export function zeroPnl(currency: string): Money {
  return Money.zero(currency);
}
