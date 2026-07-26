import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { Clock } from "../../domain/shared/id.js";
import { TaskScheduler } from "../../domain/shared/task-scheduler.js";
import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { RequestContext } from "../shared/context.js";

export class ListExchangeActivity {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly access: AccountConnectionAccess,
    private readonly scheduler: TaskScheduler,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext) {
    const page = await this.accounts.list(context.tenantId, { limit: 100 });
    const accounts = page.items.filter((account) => {
      const state = account.snapshot();
      return state.marketType === "swap" && state.status === "connected";
    });
    const pages = await this.scheduler.map(accounts, async (account) => {
      const state = account.snapshot();
      try {
        const connection = await this.access.forAccount(
          context.tenantId,
          state.id,
        );
        const activity = await connection.gateway.fetchActivity(
          connection.credentials,
        );
        const enrich = <T extends object>(item: T) => ({
          ...item,
          accountId: state.id,
          accountLabel: state.label,
        });
        return {
          openOrders: activity.openOrders.map(enrich),
          recentOrders: activity.recentOrders.map(enrich),
          recentTrades: activity.recentTrades.map(enrich),
          failures: [],
        };
      } catch (error) {
        return {
          openOrders: [],
          recentOrders: [],
          recentTrades: [],
          failures: [{
            accountId: state.id,
            accountLabel: state.label,
            message: error instanceof Error ? error.message : "Ошибка MEXC",
          }],
        };
      }
    });
    return {
      openOrders: pages.flatMap((page) => page.openOrders),
      recentOrders: pages.flatMap((page) => page.recentOrders),
      recentTrades: pages.flatMap((page) => page.recentTrades),
      failures: pages.flatMap((page) => page.failures),
      updatedAt: this.clock.now(),
    };
  }
}
