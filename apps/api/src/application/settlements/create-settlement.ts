import { CreateSettlementInput } from "@axiom/contracts";
import { AccountRepository, BalanceRepository } from "../../domain/accounts/account-ports.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { SettlementRepository, SplitAddressBook } from "../../domain/settlements/settlement-ports.js";
import { Settlement } from "../../domain/settlements/settlement.js";
import { AuditWriter, RequestContext } from "../shared/context.js";

export class CreateSettlement {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly balances: BalanceRepository,
    private readonly settlements: SettlementRepository,
    private readonly splits: SplitAddressBook,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext, input: CreateSettlementInput) {
    const account = await this.accounts.findById(context.tenantId, input.accountId);
    if (!account) throw new NotFoundError("InvestorAccount", input.accountId);
    const balance = await this.balances.latest(input.accountId);
    if (!balance) throw new NotFoundError("BalanceSnapshot", input.accountId);
    const previous = await this.settlements.latestAnchor(input.accountId);
    const accountState = account.snapshot();

    const settlement = Settlement.calculate({
      id: this.ids.next(),
      tenantId: context.tenantId,
      accountId: input.accountId,
      investorName: accountState.investorName,
      periodStart: previous?.periodEnd ?? accountState.createdAt,
      periodEnd: new Date(input.periodEnd),
      currentEquity: balance.equity,
      previousHighWaterMark: previous?.highWaterMark ?? balance.equity.subtract(balance.pnlTotal),
      traderSharePercent: input.traderSharePercent,
      createdAt: this.clock.now(),
    });
    const splitAddress = await this.splits.getImmutableSplit(input.accountId);
    if (splitAddress) settlement.requestFunding(splitAddress);

    await this.settlements.save(settlement);
    await this.audit.write({
      context,
      action: "settlement.created",
      aggregateType: "Settlement",
      aggregateId: settlement.snapshot().id,
      payload: {
        accountId: input.accountId,
        grossProfit: settlement.snapshot().grossProfit.toString(),
      },
    });
    return settlement.snapshot();
  }
}
