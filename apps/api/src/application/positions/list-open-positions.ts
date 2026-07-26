import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { ExchangePosition } from "../../domain/exchange/exchange-gateway.js";
import { Clock } from "../../domain/shared/id.js";
import { TaskScheduler } from "../../domain/shared/task-scheduler.js";
import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { RequestContext } from "../shared/context.js";

interface EnrichedPosition extends ExchangePosition {
  accountId: string;
  accountLabel: string;
  investorName: string;
  canAdjustMargin: boolean;
}

interface PositionFailure {
  accountId: string;
  accountLabel: string;
  message: string;
}

export class ListOpenPositions {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly connections: AccountConnectionAccess,
    private readonly scheduler: TaskScheduler,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext) {
    const page = await this.accounts.list(context.tenantId, { limit: 100 });
    const futuresAccounts = page.items.filter((account) => {
      const state = account.snapshot();
      return state.marketType === "swap" && state.status === "connected";
    });
    const results = await this.scheduler.map(futuresAccounts, async (account) => {
      const state = account.snapshot();
      try {
        const connection = await this.connections.forAccount(
          context.tenantId,
          state.id,
        );
        const positions = await connection.gateway.fetchPositions(
          connection.credentials,
        );
        return {
          items: positions.map((position): EnrichedPosition => ({
            ...position,
            accountId: state.id,
            accountLabel: state.label,
            investorName: state.investorName,
            canAdjustMargin: position.marginMode === "isolated",
          })),
          failures: [] as PositionFailure[],
        };
      } catch (error) {
        return {
          items: [] as EnrichedPosition[],
          failures: [{
            accountId: state.id,
            accountLabel: state.label,
            message: readableMessage(error),
          }],
        };
      }
    });

    return {
      items: results.flatMap((result) => result.items),
      failures: results.flatMap((result) => result.failures),
      updatedAt: this.clock.now(),
    };
  }
}

function readableMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Не удалось получить позиции счёта";
}
