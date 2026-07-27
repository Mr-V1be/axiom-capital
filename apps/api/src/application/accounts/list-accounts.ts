import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import { RiskProfileRepository } from "../../domain/risk/risk-profile.js";
import { RequestContext } from "../shared/context.js";

export class ListAccounts {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
    private readonly riskProfiles: RiskProfileRepository,
  ) {}

  async execute(
    context: RequestContext,
    page: { cursor?: string; limit: number },
  ) {
    const result = await this.accounts.list(context.tenantId, page);
    const profiles = await this.riskProfiles.getMany(
      result.items.map((account) => account.snapshot().id),
    );
    const items = await Promise.all(
      result.items.map(async (account) => ({
        account: account.snapshot(),
        balance: await this.balances.latest(account.snapshot().id),
        riskProfile: profiles.get(account.snapshot().id),
      })),
    );
    return { items, nextCursor: result.nextCursor };
  }
}
