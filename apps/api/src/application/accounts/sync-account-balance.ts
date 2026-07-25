import {
  AccountRepository,
  BalanceRepository,
} from "../../domain/accounts/account-ports.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import { AuditWriter, RequestContext } from "../shared/context.js";
import { AccountConnectionAccess } from "./account-connection-access.js";

export class SyncAccountBalance {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
    private readonly access: AccountConnectionAccess,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext, accountId: string) {
    const { account, gateway, credentials } = await this.access.forAccount(
      context.tenantId,
      accountId,
    );
    try {
      const balance = await gateway.fetchBalance(credentials);
      const now = this.clock.now();
      await this.balances.save({
        accountId,
        equity: Money.of(balance.equity, balance.currency),
        pnlToday: Money.zero(balance.currency),
        pnlTotal: Money.zero(balance.currency),
        balances: balance.balances,
        capturedAt: now,
      });
      account.markConnected(now);
      await this.accounts.save(account);
      await this.audit.write({
        context,
        action: "account.balance_synced",
        aggregateType: "InvestorAccount",
        aggregateId: accountId,
        payload: { currency: balance.currency },
      });
      return { account: account.snapshot(), balance: await this.balances.latest(accountId) };
    } catch (error) {
      account.markDegraded();
      await this.accounts.save(account);
      throw error;
    }
  }
}
