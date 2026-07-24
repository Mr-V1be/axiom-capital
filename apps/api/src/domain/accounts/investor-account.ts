import { DomainError } from "../shared/domain-error.js";

export type AccountStatus = "pending" | "connected" | "degraded" | "disabled";
export type ExchangeName = "mexc";
export type AccountScope = "standalone" | "subaccount";
export type MarketType = "spot" | "swap";

export interface InvestorAccountState {
  id: string;
  tenantId: string;
  label: string;
  investorName: string;
  exchange: ExchangeName;
  accountScope: AccountScope;
  marketType: MarketType;
  externalAccountId?: string;
  status: AccountStatus;
  encryptedKey: string;
  encryptedSecret: string;
  createdAt: Date;
  lastSyncedAt?: Date;
}

export class InvalidAccountError extends DomainError {
  readonly code = "INVALID_ACCOUNT";
}

export class InvestorAccount {
  private constructor(private state: InvestorAccountState) {}

  static create(state: InvestorAccountState): InvestorAccount {
    if (state.label.trim().length < 2) {
      throw new InvalidAccountError("Account label is too short");
    }
    if (state.investorName.trim().length < 2) {
      throw new InvalidAccountError("Investor name is too short");
    }
    if (state.accountScope === "subaccount" && !state.externalAccountId?.trim()) {
      throw new InvalidAccountError("Subaccount identifier is required");
    }
    return new InvestorAccount({
      ...state,
      label: state.label.trim(),
      investorName: state.investorName.trim(),
      ...(state.externalAccountId
        ? { externalAccountId: state.externalAccountId.trim() }
        : {}),
    });
  }

  markConnected(at: Date): void {
    if (this.state.status === "disabled") {
      throw new InvalidAccountError("Disabled account cannot be connected");
    }
    this.state = { ...this.state, status: "connected", lastSyncedAt: at };
  }

  markDegraded(): void {
    if (this.state.status !== "disabled") {
      this.state = { ...this.state, status: "degraded" };
    }
  }

  disable(): void {
    this.state = { ...this.state, status: "disabled" };
  }

  snapshot(): Readonly<InvestorAccountState> {
    return Object.freeze({ ...this.state });
  }
}
