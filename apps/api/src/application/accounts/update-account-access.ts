import { UpdateAccountAccessInput } from "@axiom/contracts";
import { AccountAccessUpdater } from "../../domain/accounts/account-ports.js";
import { AuditWriter, RequestContext } from "../shared/context.js";
import { AccountConnectionAccess } from "./account-connection-access.js";

export class UpdateAccountAccess {
  constructor(
    private readonly access: AccountConnectionAccess,
    private readonly updater: AccountAccessUpdater,
    private readonly audit: AuditWriter,
  ) {}

  async execute(
    context: RequestContext,
    accountId: string,
    input: UpdateAccountAccessInput,
  ) {
    const { account, gateway, credentials } = await this.access.forAccount(
      context.tenantId,
      accountId,
    );
    await gateway.verifyAccess(credentials, input.accessMode);
    account.changeAccessMode(input.accessMode);
    await this.updater.updateAccess(account);
    await this.audit.write({
      context,
      action: "account.access_updated",
      aggregateType: "InvestorAccount",
      aggregateId: accountId,
      payload: { accessMode: input.accessMode },
    });
    return account.snapshot();
  }
}
