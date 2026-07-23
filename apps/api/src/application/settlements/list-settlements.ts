import { SettlementRepository } from "../../domain/settlements/settlement-ports.js";
import { RequestContext } from "../shared/context.js";

export class ListSettlements {
  constructor(private readonly settlements: SettlementRepository) {}

  execute(
    context: RequestContext,
    page: { cursor?: string; limit: number },
  ) {
    return this.settlements.list(context.tenantId, page);
  }
}
