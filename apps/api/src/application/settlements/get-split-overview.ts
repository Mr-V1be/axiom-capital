import {
  SplitConfigurationRepository,
  SplitProvisioningGateway,
} from "../../domain/settlements/settlement-ports.js";
import { RequestContext } from "../shared/context.js";

export class GetSplitOverview {
  constructor(
    private readonly configurations: SplitConfigurationRepository,
    private readonly gateway: SplitProvisioningGateway,
  ) {}

  async execute(context: RequestContext) {
    const [network, items] = await Promise.all([
      this.gateway.status(),
      this.configurations.listByTenant(context.tenantId),
    ]);
    return { network, items };
  }
}
