import { Money } from "../../domain/shared/money.js";
import {
  SettlementRepository,
  SplitAddressBook,
} from "../../domain/settlements/settlement-ports.js";
import {
  Settlement,
  SettlementStatus,
} from "../../domain/settlements/settlement.js";
import { SettlementStatus as DbStatus } from "../../generated/prisma/enums.js";
import type { Settlement as DbSettlement } from "../../generated/prisma/client.js";
import { Database } from "./prisma-client.js";

const toDbStatus: Record<SettlementStatus, DbStatus> = {
  calculated: "CALCULATED",
  awaiting_investor: "AWAITING_INVESTOR",
  funded: "FUNDED",
  distributed: "DISTRIBUTED",
  cancelled: "CANCELLED",
};

export class PrismaSettlementRepository
  implements SettlementRepository, SplitAddressBook
{
  constructor(private readonly db: Database) {}

  async latestAnchor(accountId: string) {
    const row = await this.db.settlement.findFirst({
      where: { accountId, status: { not: "CANCELLED" } },
      orderBy: { periodEnd: "desc" },
      select: { periodEnd: true, highWaterMark: true, currency: true },
    });
    return row
      ? {
          periodEnd: row.periodEnd,
          highWaterMark: Money.of(row.highWaterMark.toString(), row.currency),
        }
      : null;
  }

  async save(settlement: Settlement): Promise<void> {
    const state = settlement.snapshot();
    await this.db.settlement.create({
      data: {
        id: state.id,
        tenantId: state.tenantId,
        accountId: state.accountId,
        periodStart: state.periodStart,
        periodEnd: state.periodEnd,
        grossProfit: state.grossProfit.toString(),
        investorShare: state.investorShare.toString(),
        traderShare: state.traderShare.toString(),
        traderSharePct: state.traderSharePercent,
        highWaterMark: state.highWaterMark.toString(),
        currency: state.grossProfit.currency,
        splitAddress: state.splitAddress ?? null,
        status: toDbStatus[state.status],
        createdAt: state.createdAt,
      },
    });
  }

  async list(tenantId: string, page: { cursor?: string; limit: number }) {
    const rows = await this.db.settlement.findMany({
      where: { tenantId },
      include: { account: { select: { investorName: true } } },
      orderBy: { id: "asc" },
      take: page.limit + 1,
      ...(page.cursor ? { cursor: { id: page.cursor }, skip: 1 } : {}),
    });
    const hasNext = rows.length > page.limit;
    const items = rows.slice(0, page.limit);
    return {
      items: items.map((row: DbSettlement & {
        account: { investorName: string };
      }) => Settlement.rehydrate({
        id: row.id,
        tenantId: row.tenantId,
        accountId: row.accountId,
        investorName: row.account.investorName,
        periodStart: row.periodStart,
        periodEnd: row.periodEnd,
        grossProfit: Money.of(row.grossProfit.toString(), row.currency),
        investorShare: Money.of(row.investorShare.toString(), row.currency),
        traderShare: Money.of(row.traderShare.toString(), row.currency),
        traderSharePercent: Number(row.traderSharePct),
        highWaterMark: Money.of(row.highWaterMark.toString(), row.currency),
        status: row.status.toLowerCase() as SettlementStatus,
        createdAt: row.createdAt,
        ...(row.splitAddress ? { splitAddress: row.splitAddress } : {}),
      })),
      ...(hasNext ? { nextCursor: items.at(-1)?.id } : {}),
    };
  }

  async getImmutableSplit(accountId: string): Promise<string | null> {
    const row = await this.db.splitConfiguration.findFirst({
      where: { accountId, immutable: true, verifiedAt: { not: null } },
      select: { address: true },
    });
    return row?.address ?? null;
  }

}
