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
    return {
      accountId,
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
