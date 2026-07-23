import { InvestorAccount } from "./investor-account.js";
import { Money } from "../shared/money.js";

export interface AccountCredentials {
  apiKey: string;
  secret: string;
}

export interface AccountRepository {
  findById(tenantId: string, id: string): Promise<InvestorAccount | null>;
  existsByLabel(tenantId: string, label: string): Promise<boolean>;
  save(account: InvestorAccount): Promise<void>;
  list(
    tenantId: string,
    page: { cursor?: string; limit: number },
  ): Promise<{ items: InvestorAccount[]; nextCursor?: string }>;
}

export interface BalanceSnapshot {
  accountId: string;
  equity: Money;
  pnlToday: Money;
  pnlTotal: Money;
  balances: Readonly<Record<string, string>>;
  capturedAt: Date;
}

export interface BalanceRepository {
  latest(accountId: string): Promise<BalanceSnapshot | null>;
  save(snapshot: BalanceSnapshot): Promise<void>;
  equityCurve(
    tenantId: string,
    since: Date,
  ): Promise<ReadonlyArray<{ at: Date; value: Money }>>;
}

export interface AccountProvisioner {
  provision(
    account: InvestorAccount,
    initialBalance: BalanceSnapshot,
  ): Promise<void>;
}
