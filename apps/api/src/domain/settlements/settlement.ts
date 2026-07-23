import { DomainError } from "../shared/domain-error.js";
import { Money } from "../shared/money.js";

export type SettlementStatus =
  | "calculated"
  | "awaiting_investor"
  | "funded"
  | "distributed"
  | "cancelled";

export interface SettlementState {
  id: string;
  tenantId: string;
  accountId: string;
  investorName: string;
  periodStart: Date;
  periodEnd: Date;
  grossProfit: Money;
  investorShare: Money;
  traderShare: Money;
  traderSharePercent: number;
  highWaterMark: Money;
  status: SettlementStatus;
  createdAt: Date;
  splitAddress?: string;
}

export class InvalidSettlementError extends DomainError {
  readonly code = "INVALID_SETTLEMENT";
}

export class Settlement {
  private constructor(private state: SettlementState) {}

  static rehydrate(state: SettlementState): Settlement {
    return new Settlement({ ...state });
  }

  static calculate(input: {
    id: string;
    tenantId: string;
    accountId: string;
    investorName: string;
    periodStart: Date;
    periodEnd: Date;
    currentEquity: Money;
    previousHighWaterMark: Money;
    traderSharePercent: number;
    createdAt: Date;
  }): Settlement {
    if (input.periodEnd <= input.periodStart) {
      throw new InvalidSettlementError("Settlement period must move forward");
    }
    if (input.traderSharePercent < 0 || input.traderSharePercent > 50) {
      throw new InvalidSettlementError("Trader share must be between 0 and 50");
    }

    const profit = input.currentEquity.subtract(input.previousHighWaterMark);
    if (!profit.isPositive()) {
      throw new InvalidSettlementError("No profit above the high-water mark");
    }
    const traderShare = profit.percentage(input.traderSharePercent);
    const investorShare = profit.subtract(traderShare);

    return new Settlement({
      id: input.id,
      tenantId: input.tenantId,
      accountId: input.accountId,
      investorName: input.investorName,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      grossProfit: profit,
      investorShare,
      traderShare,
      traderSharePercent: input.traderSharePercent,
      highWaterMark: input.currentEquity,
      status: "calculated",
      createdAt: input.createdAt,
    });
  }

  requestFunding(splitAddress: string): void {
    if (this.state.status !== "calculated") {
      throw new InvalidSettlementError("Only calculated settlement can be funded");
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(splitAddress)) {
      throw new InvalidSettlementError("Invalid EVM split address");
    }
    this.state = {
      ...this.state,
      splitAddress,
      status: "awaiting_investor",
    };
  }

  snapshot(): Readonly<SettlementState> {
    return Object.freeze({ ...this.state });
  }
}
