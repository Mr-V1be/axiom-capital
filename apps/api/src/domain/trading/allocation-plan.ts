import { Decimal } from "decimal.js";
import { Money } from "../shared/money.js";
import {
  AllocationRequest,
  AllocationStrategy,
  AllocationTarget,
} from "./trading-ports.js";

const AllocationDecimal = Decimal.clone({ precision: 50 });

export class ProportionalAllocationStrategy implements AllocationStrategy {
  plan(
    targets: readonly AllocationTarget[],
    request: AllocationRequest,
  ): ReadonlyMap<string, Money> {
    if (targets.length === 0) throw new Error("Allocation targets are required");
    this.assertUniqueAccounts(targets);

    if (request.mode === "equity_percentage") {
      return this.byPercentage(targets, request.percentage);
    }
    return this.byFixedQuote(targets, request.totalQuoteAmount);
  }

  private byPercentage(targets: readonly AllocationTarget[], percentage: number) {
    if (percentage <= 0 || percentage > 100) {
      throw new Error("Allocation percentage must be within (0, 100]");
    }
    return new Map(
      targets.map((target) => [
        target.accountId,
        target.equity.percentage(percentage),
      ]),
    );
  }

  private byFixedQuote(
    targets: readonly AllocationTarget[],
    totalQuoteAmount: string,
  ) {
    const currency = targets[0]!.equity.currency;
    const totalEquity = targets.reduce(
      (sum, target) => sum.plus(this.equity(target, currency)),
      new AllocationDecimal(0),
    );
    const requested = new AllocationDecimal(totalQuoteAmount);
    if (!requested.isPositive() || requested.greaterThan(totalEquity)) {
      throw new Error("Fixed quote must be positive and within total equity");
    }

    let assigned = new AllocationDecimal(0);
    return new Map(
      targets.map((target, index) => {
        const amount = index === targets.length - 1
          ? requested.minus(assigned)
          : requested
              .times(this.equity(target, currency))
              .dividedBy(totalEquity)
              .toDecimalPlaces(18, Decimal.ROUND_DOWN);
        assigned = assigned.plus(amount);
        return [target.accountId, Money.of(amount, currency)];
      }),
    );
  }

  private equity(target: AllocationTarget, currency: string): Decimal {
    if (target.equity.currency !== currency) {
      throw new Error("All allocation targets must use one quote currency");
    }
    return new AllocationDecimal(target.equity.toString());
  }

  private assertUniqueAccounts(targets: readonly AllocationTarget[]): void {
    const ids = new Set(targets.map((target) => target.accountId));
    if (ids.size !== targets.length) {
      throw new Error("Allocation targets must be unique");
    }
  }
}
