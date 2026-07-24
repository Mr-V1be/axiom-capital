import { AccountRepository } from "../../domain/accounts/account-ports.js";
import { ExchangeGatewayFactory } from "../../domain/exchange/exchange-gateway.js";
import { NotFoundError } from "../../domain/shared/domain-error.js";
import { SecretCipher } from "../shared/context.js";

export class OrderExecutionAccess {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly exchanges: ExchangeGatewayFactory,
    private readonly cipher: SecretCipher,
  ) {}

  async forAccount(tenantId: string, accountId: string) {
    const account = await this.accounts.findById(tenantId, accountId);
    if (!account) throw new NotFoundError("InvestorAccount", accountId);
    const state = account.snapshot();
    const [apiKey, secret] = await Promise.all([
      this.cipher.decrypt(state.encryptedKey),
      this.cipher.decrypt(state.encryptedSecret),
    ]);
    return {
      gateway: this.exchanges.for(state.exchange),
      credentials: {
        apiKey,
        secret,
        marketType: state.marketType,
        ...(state.externalAccountId
          ? { externalAccountId: state.externalAccountId }
          : {}),
      },
    };
  }
}
