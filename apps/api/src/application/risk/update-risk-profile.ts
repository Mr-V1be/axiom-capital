import { UpdateRiskProfileInput } from "@axiom/contracts";
import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { RiskProfileRepository } from "../../domain/risk/risk-profile.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { AuditWriter, RequestContext } from "../shared/context.js";

export class UpdateRiskProfile {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly profiles: RiskProfileRepository,
    private readonly audit: AuditWriter,
  ) {}

  async execute(
    context: RequestContext,
    accountId: string,
    input: UpdateRiskProfileInput,
  ) {
    const account = await this.accounts.findById(context.tenantId, accountId);
    if (!account) throw new NotFoundError("InvestorAccount", accountId);
    const previous = await this.profiles.get(accountId);
    const updated = await this.profiles.updateMaxAllocation(
      accountId,
      input.maxAllocationPercent,
    );
    await this.audit.write({
      context,
      action: "risk.max_allocation_updated",
      aggregateType: "RiskProfile",
      aggregateId: accountId,
      payload: {
        previousPercent: previous.maxAllocationPercent,
        maxAllocationPercent: updated.maxAllocationPercent,
      },
    });
    return updated;
  }
}
