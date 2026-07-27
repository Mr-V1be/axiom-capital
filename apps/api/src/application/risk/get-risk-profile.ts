import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { RiskProfileRepository } from "../../domain/risk/risk-profile.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { RequestContext } from "../shared/context.js";

export class GetRiskProfile {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly profiles: RiskProfileRepository,
  ) {}

  async execute(context: RequestContext, accountId: string) {
    const account = await this.accounts.findById(context.tenantId, accountId);
    if (!account) throw new NotFoundError("InvestorAccount", accountId);
    return this.profiles.get(accountId);
  }
}
