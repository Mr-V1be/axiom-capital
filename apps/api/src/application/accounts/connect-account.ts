import { ConnectAccountInput } from "@axiom/contracts";
import {
  AccountProvisioner,
  AccountRepository,
} from "../../domain/accounts/account-ports.js";
import { InvestorAccount } from "../../domain/accounts/investor-account.js";
import { ExchangeGatewayFactory } from "../../domain/exchange/exchange-gateway.js";
import { ConflictError } from "../../domain/shared/domain-error.js";
import { Clock, IdGenerator } from "../../domain/shared/id.js";
import { Money } from "../../domain/shared/money.js";
import { AuditWriter, RequestContext, SecretCipher } from "../shared/context.js";

export class ConnectAccount {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly provisioner: AccountProvisioner,
    private readonly exchanges: ExchangeGatewayFactory,
    private readonly cipher: SecretCipher,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(context: RequestContext, input: ConnectAccountInput) {
    if (await this.accounts.existsByLabel(context.tenantId, input.label)) {
      throw new ConflictError(`Account label "${input.label}" already exists`);
    }

    const credentials = {
      apiKey: input.apiKey,
      secret: input.secret,
      marketType: input.marketType,
      ...(input.externalAccountId
        ? { externalAccountId: input.externalAccountId }
        : {}),
    };
    const gateway = this.exchanges.for(input.exchange);
    await gateway.verifyReadTradeOnly(credentials);
    const balance = await gateway.fetchBalance(credentials);
    const now = this.clock.now();

    const [encryptedKey, encryptedSecret] = await Promise.all([
      this.cipher.encrypt(input.apiKey),
      this.cipher.encrypt(input.secret),
    ]);

    const account = InvestorAccount.create({
      id: this.ids.next(),
      tenantId: context.tenantId,
      label: input.label,
      investorName: input.investorName,
      exchange: input.exchange,
      accountScope: input.accountScope,
      marketType: input.marketType,
      ...(input.externalAccountId
        ? { externalAccountId: input.externalAccountId }
        : {}),
      status: "pending",
      encryptedKey,
      encryptedSecret,
      createdAt: now,
    });
    account.markConnected(now);

    await this.provisioner.provision(account, {
      accountId: account.snapshot().id,
      equity: Money.of(balance.equity, balance.currency),
      pnlToday: Money.zero(balance.currency),
      pnlTotal: Money.zero(balance.currency),
      balances: balance.balances,
      capturedAt: now,
    });
    await this.audit.write({
      context,
      action: "account.connected",
      aggregateType: "InvestorAccount",
      aggregateId: account.snapshot().id,
      payload: {
        exchange: input.exchange,
        accountScope: input.accountScope,
        marketType: input.marketType,
        withdrawalDisabled: input.withdrawDisabledConfirmed,
      },
    });

    return account.snapshot();
  }
}
