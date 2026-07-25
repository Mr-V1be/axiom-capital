import { BalanceRepository } from "../../domain/accounts/account-ports.js";
import { RequestContext } from "../shared/context.js";
import { AccountConnectionAccess } from "./account-connection-access.js";

export class GetAccountDetails {
  constructor(
    private readonly access: AccountConnectionAccess,
    private readonly balances: BalanceRepository,
  ) {}

  async execute(context: RequestContext, accountId: string) {
    const { account, gateway, credentials } = await this.access.forAccount(
      context.tenantId,
      accountId,
    );
    const [details, balance] = await Promise.all([
      gateway.fetchAccountDetails(credentials),
      this.balances.latest(accountId),
    ]);
    return {
      account: account.snapshot(),
      balance,
      details,
    };
  }
}
