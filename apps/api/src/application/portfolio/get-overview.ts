import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import { Clock } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import { RequestContext } from "../shared/context.js";

export class GetPortfolioOverview {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext) {
    const now = this.clock.now();
    const accountPage = await this.accounts.list(context.tenantId, { limit: 100 });
    const snapshots = await Promise.all(
      accountPage.items.map((account) =>
        this.balances.latest(account.snapshot().id),
      ),
    );
    const available = snapshots.filter((item) => item !== null);
    const currency = available[0]?.equity.currency ?? "USDT";
    const totalEquity = available.reduce(
      (total, item) => total.add(item.equity),
      Money.zero(currency),
    );
    const pnlToday = available.reduce(
      (total, item) => total.add(item.pnlToday),
      Money.zero(currency),
    );
    const pnlTotal = available.reduce(
      (total, item) => total.add(item.pnlTotal),
      Money.zero(currency),
    );
    const since = new Date(now);
    since.setUTCDate(since.getUTCDate() - 30);
    const curve = await this.balances.equityCurve(context.tenantId, since);

    return {
      totalEquity,
      pnlToday,
      pnlMonth: pnlTotal,
      activeAccounts: accountPage.items.length,
      connectedAccounts: accountPage.items.filter(
        (item) => item.snapshot().status === "connected",
      ).length,
      maxDrawdownPercent: this.maxDrawdown(curve.map((point) => point.value)),
      equityCurve: curve,
      updatedAt: now,
    };
  }

  private maxDrawdown(values: readonly Money[]): number {
    if (values.length < 2) return 0;
    let peak = Number(values[0]?.toString() ?? 0);
    let maxDrawdown = 0;
    for (const money of values) {
      const value = Number(money.toString());
      peak = Math.max(peak, value);
      if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak);
    }
    return Number((maxDrawdown * 100).toFixed(2));
  }
}
