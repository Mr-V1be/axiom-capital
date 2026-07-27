import {
  RiskProfile,
  RiskProfileRepository,
} from "../../domain/risk/risk-profile.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { IdGenerator } from "../../domain/shared/id.js";
import { Database } from "./prisma-client.js";

export class PrismaRiskProfileRepository implements RiskProfileRepository {
  constructor(
    private readonly db: Database,
    private readonly ids: IdGenerator,
  ) {}

  async get(accountId: string): Promise<RiskProfile> {
    const row = await this.db.riskProfile.findUnique({ where: { accountId } });
    if (!row) throw new NotFoundError("RiskProfile", accountId);
    return this.toDomain(row);
  }

  async getMany(
    accountIds: readonly string[],
  ): Promise<ReadonlyMap<string, RiskProfile>> {
    if (accountIds.length === 0) return new Map();
    const rows = await this.db.riskProfile.findMany({
      where: { accountId: { in: [...accountIds] } },
    });
    return new Map(rows.map((row) => [row.accountId, this.toDomain(row)]));
  }

  async updateMaxAllocation(
    accountId: string,
    maxAllocationPercent: number,
  ): Promise<RiskProfile> {
    const row = await this.db.riskProfile.update({
      where: { accountId },
      data: { maxAllocationPct: maxAllocationPercent },
    });
    return this.toDomain(row);
  }

  private toDomain(row: {
    accountId: string;
    maxAllocationPct: { toString(): string };
    maxDailyLossPct: { toString(): string };
    maxOpenPositions: number;
    allowedSymbols: string[];
    tradingEnabled: boolean;
  }): RiskProfile {
    return {
      accountId: row.accountId,
      maxAllocationPercent: Number(row.maxAllocationPct),
      maxDailyLossPercent: Number(row.maxDailyLossPct),
      maxOpenPositions: row.maxOpenPositions,
      allowedSymbols: row.allowedSymbols,
      tradingEnabled: row.tradingEnabled,
    };
  }

  async createDefaults(accountId: string): Promise<void> {
    await this.db.riskProfile.create({
      data: {
        id: this.ids.next(),
        accountId,
        maxAllocationPct: 10,
        maxDailyLossPct: 3,
        maxOpenPositions: 5,
        allowedSymbols: ["BTC/USDT", "ETH/USDT"],
      },
    });
  }
}
