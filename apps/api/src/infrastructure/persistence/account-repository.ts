import {
  AccountProvisioner,
  AccountRepository,
  BalanceSnapshot,
} from "../../domain/accounts/account-ports.js";
import {
  AccountStatus,
  InvestorAccount,
  InvestorAccountState,
} from "../../domain/accounts/investor-account.js";
import { AccountStatus as DbAccountStatus } from "../../generated/prisma/enums.js";
import type { InvestorAccount as DbInvestorAccount } from "../../generated/prisma/client.js";
import { IdGenerator } from "../../domain/shared/id.js";
import { Database } from "./prisma-client.js";

const toDbStatus: Record<AccountStatus, DbAccountStatus> = {
  pending: "PENDING",
  connected: "CONNECTED",
  degraded: "DEGRADED",
  disabled: "DISABLED",
};

const toDomainStatus: Record<DbAccountStatus, AccountStatus> = {
  PENDING: "pending",
  CONNECTED: "connected",
  DEGRADED: "degraded",
  DISABLED: "disabled",
};

export class PrismaAccountRepository
  implements AccountRepository, AccountProvisioner
{
  constructor(
    private readonly db: Database,
    private readonly ids: IdGenerator,
  ) {}

  async findById(tenantId: string, id: string) {
    const row = await this.db.investorAccount.findFirst({
      where: { id, tenantId },
    });
    return row ? this.toDomain(row) : null;
  }

  async existsByLabel(tenantId: string, label: string): Promise<boolean> {
    return Boolean(
      await this.db.investorAccount.findUnique({
        where: { tenantId_label: { tenantId, label } },
        select: { id: true },
      }),
    );
  }

  async save(account: InvestorAccount): Promise<void> {
    const state = account.snapshot();
    await this.db.investorAccount.update({
      where: { id: state.id },
      data: {
        status: toDbStatus[state.status],
        lastSyncedAt: state.lastSyncedAt ?? null,
      },
    });
  }

  async provision(
    account: InvestorAccount,
    balance: BalanceSnapshot,
  ): Promise<void> {
    const state = account.snapshot();
    await this.db.$transaction([
      this.db.investorAccount.create({
        data: {
          id: state.id,
          tenantId: state.tenantId,
          label: state.label,
          investorName: state.investorName,
          exchange: state.exchange,
          status: toDbStatus[state.status],
          encryptedKey: state.encryptedKey,
          encryptedSecret: state.encryptedSecret,
          createdAt: state.createdAt,
          lastSyncedAt: state.lastSyncedAt ?? null,
        },
      }),
      this.db.balanceSnapshot.create({
        data: {
          id: this.ids.next(),
          accountId: state.id,
          equity: balance.equity.toString(),
          pnlToday: balance.pnlToday.toString(),
          pnlTotal: balance.pnlTotal.toString(),
          currency: balance.equity.currency,
          balances: { ...balance.balances },
          capturedAt: balance.capturedAt,
        },
      }),
      this.db.riskProfile.create({
        data: {
          id: this.ids.next(),
          accountId: state.id,
          maxAllocationPct: 10,
          maxDailyLossPct: 3,
          maxOpenPositions: 5,
          allowedSymbols: ["BTC/USDT", "ETH/USDT"],
        },
      }),
    ]);
  }

  async list(tenantId: string, page: { cursor?: string; limit: number }) {
    const rows = await this.db.investorAccount.findMany({
      where: { tenantId },
      orderBy: { id: "asc" },
      take: page.limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasNext = rows.length > page.limit;
    const items = rows.slice(0, page.limit);
    return {
      items: items.map((row: DbInvestorAccount) => this.toDomain(row)),
      ...(hasNext ? { nextCursor: items.at(-1)?.id } : {}),
    };
  }

  private toDomain(row: {
    id: string;
    tenantId: string;
    label: string;
    investorName: string;
    exchange: string;
    status: DbAccountStatus;
    encryptedKey: string;
    encryptedSecret: string;
    createdAt: Date;
    lastSyncedAt: Date | null;
  }): InvestorAccount {
    const state: InvestorAccountState = {
      id: row.id,
      tenantId: row.tenantId,
      label: row.label,
      investorName: row.investorName,
      exchange: "mexc",
      status: toDomainStatus[row.status],
      encryptedKey: row.encryptedKey,
      encryptedSecret: row.encryptedSecret,
      createdAt: row.createdAt,
      ...(row.lastSyncedAt ? { lastSyncedAt: row.lastSyncedAt } : {}),
    };
    return InvestorAccount.create(state);
  }
}
