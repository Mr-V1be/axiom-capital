import { AccountConnectionAccess } from "../accounts/account-connection-access.js";
import { PolicyViolationError } from "../../domain/shared/domain-error.js";

export class OrderExecutionAccess {
  constructor(private readonly access: AccountConnectionAccess) {}

  async forAccount(tenantId: string, accountId: string) {
    const account = await this.access.findAccount(tenantId, accountId);
    const state = account.snapshot();
    if (state.accessMode !== "trade") {
      throw new PolicyViolationError(
        "Read-only accounts cannot execute orders",
        "account_access_mode",
      );
    }
    if (state.status !== "connected") {
      throw new PolicyViolationError(
        "Only connected accounts can execute orders",
        "account_connection_status",
      );
    }
    return this.access.forAccount(tenantId, accountId);
  }
}
