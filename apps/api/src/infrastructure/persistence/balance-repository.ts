import {
  BalanceRepository,
  BalanceSnapshot,
} from "../../domain/accounts/account-ports.js";
import { IdGenerator } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import { Database } from "./prisma-client.js";

export class PrismaBalanceRepository implements BalanceRepository {
  constructor(
    private readonly db: Database,
    private readonly ids: IdGenerator,
  ) {}

  async latest(accountId: string): Promise<BalanceSnapshot | null> {
    const row = await this.db.balanceSnapshot.findFirst({
      where: { accountId },
      orderBy: { capturedAt: "desc" },
    });
    if (!row) return null;
    return {
      accountId,
      equity: Money.of(row.equity.toString(), row.currency),
      pnlToday: Money.of(row.pnlToday.toString(), row.currency),
      pnlTotal: Money.of(row.pnlTotal.toString(), row.currency),
      balances: row.balances as Record<string, string>,
      capturedAt: row.capturedAt,
    };
  }

  async save(snapshot: BalanceSnapshot): Promise<void> {
    await this.db.balanceSnapshot.create({
      data: {
        id: this.ids.next(),
        accountId: snapshot.accountId,
        equity: snapshot.equity.toString(),
        pnlToday: snapshot.pnlToday.toString(),
        pnlTotal: snapshot.pnlTotal.toString(),
        currency: snapshot.equity.currency,
        balances: { ...snapshot.balances },
        capturedAt: snapshot.capturedAt,
      },
    });
  }

  async equityCurve(tenantId: string, since: Date) {
    const rows = await this.db.balanceSnapshot.findMany({
      where: { account: { tenantId }, capturedAt: { gte: since } },
      orderBy: { capturedAt: "asc" },
      select: {
        accountId: true,
        equity: true,
        currency: true,
        capturedAt: true,
      },
    });
    const daily = new Map<string, Map<string, typeof rows[number]>>();
    for (const row of rows) {
      const day = row.capturedAt.toISOString().slice(0, 10);
      const accounts = daily.get(day) ?? new Map();
      accounts.set(row.accountId, row);
      daily.set(day, accounts);
    }
    return [...daily.entries()].map(([day, accounts]) => {
      const values = [...accounts.values()];
      const currency = values[0]?.currency ?? "USDT";
      const value = values.reduce(
        (sum, row) => sum.add(Money.of(row.equity.toString(), currency)),
        Money.zero(currency),
      );
      return { at: new Date(`${day}T23:59:59.000Z`), value };
    });
  }
}
