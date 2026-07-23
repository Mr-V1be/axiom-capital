import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import { RequestContext } from "../shared/context.js";

export class ListAccounts {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
  ) {}

  async execute(
    context: RequestContext,
    page: { cursor?: string; limit: number },
  ) {
    const result = await this.accounts.list(context.tenantId, page);
    const items = await Promise.all(
      result.items.map(async (account) => ({
        account: account.snapshot(),
        balance: await this.balances.latest(account.snapshot().id),
      })),
    );
    return { items, nextCursor: result.nextCursor };
  }
}
