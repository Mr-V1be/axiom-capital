import { AccountRepository } from "../../domain/accounts/account-ports.js";
import {
  SplitConfigurationRepository,
  SplitProvisioningGateway,
} from "../../domain/settlements/settlement-ports.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { AuditWriter, RequestContext } from "../shared/context.js";

export class ProvisionTestSplit {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly configurations: SplitConfigurationRepository,
    private readonly gateway: SplitProvisioningGateway,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(
    context: RequestContext,
    input: { accountId: string; traderSharePercent: number },
  ) {
    const account = await this.accounts.findById(
      context.tenantId,
      input.accountId,
    );
    if (!account) throw new NotFoundError("InvestorAccount", input.accountId);
    const existing = await this.configurations.findByAccount(input.accountId);
    const provisioned = await this.gateway.provision({
      tenantId: context.tenantId,
      accountId: input.accountId,
      traderSharePercent: existing?.traderSharePercent ??
        input.traderSharePercent,
    });
    const configuration = {
      id: existing?.id ?? this.ids.next(),
      accountId: input.accountId,
      immutable: true as const,
      createdAt: existing?.createdAt ?? this.clock.now(),
      ...provisioned,
    };
    await this.configurations.save(configuration);
    await this.audit.write({
      context,
      action: "split.testnet_provisioned",
      aggregateType: "SplitConfiguration",
      aggregateId: configuration.id,
      payload: {
        accountId: input.accountId,
        chainId: configuration.chainId,
        address: configuration.address,
        investorAddress: configuration.investorAddress,
        traderAddress: configuration.traderAddress,
        traderSharePercent: configuration.traderSharePercent,
        immutable: true,
        ...(configuration.deploymentTxHash
          ? { deploymentTxHash: configuration.deploymentTxHash }
          : {}),
      },
    });
    return configuration;
  }
}
