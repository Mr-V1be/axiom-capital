import type { mexc } from "ccxt";
import { Decimal } from "decimal.js";
import {
  CapabilityState,
  ExchangeAccountDetails,
  ExchangeCapability,
} from "../../domain/exchange/exchange-gateway.js";

interface CheckResult<T> {
  capability: ExchangeCapability;
  value?: T;
}

interface SpotAccountResponse {
  accountType?: string;
  canTrade?: boolean;
  canWithdraw?: boolean;
  canDeposit?: boolean;
  permissions?: string[];
  balances?: Array<{ asset?: string; free?: string; locked?: string }>;
}

interface KycResponse {
  status?: string | number;
}

interface SymbolsResponse {
  data?: string[];
}

export class MexcAccountInspector {
  constructor(
    private readonly client: mexc,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async inspect(): Promise<ExchangeAccountDetails> {
    const [
      account,
      spotOrderRead,
      spotOrderWrite,
      depositRead,
      transferRead,
      withdrawRead,
      kyc,
      symbols,
      futuresAccountRead,
      futuresOrderRead,
      futuresOrderWrite,
    ] = await Promise.all([
      this.check<SpotAccountResponse>(() => this.client.spotPrivateGetAccount()),
      this.check(() =>
        this.client.spotPrivateGetOpenOrders({ symbol: "BTCUSDT" })
      ),
      this.check(() => this.testSpotOrder()),
      this.check(() =>
        this.client.spotPrivateGetCapitalDepositHisrec({
          coin: "USDT",
          limit: 1,
        })
      ),
      this.check(() =>
        this.client.spotPrivateGetCapitalTransfer({
          fromAccountType: "SPOT",
          toAccountType: "FUTURES",
          page: 1,
          size: 1,
        })
      ),
      this.check(() =>
        this.client.spotPrivateGetCapitalWithdrawAddress({ coin: "USDT" })
      ),
      this.check<KycResponse>(() => this.client.spotPrivateGetKycStatus()),
      this.check<SymbolsResponse>(() => this.client.spotPrivateGetSelfSymbols()),
      this.check(() => this.client.contractPrivateGetAccountAssets()),
      this.check(() => this.client.contractPrivateGetOrderListOpenOrders()),
      this.check(() =>
        this.client.contractPrivateGetPositionPositionMode()
      ),
    ]);
    const profile = this.profile(account.value);

    return {
      profile,
      kyc: this.kyc(kyc.value),
      capabilities: {
        spotAccountRead: account.capability,
        spotOrderRead: spotOrderRead.capability,
        spotOrderWrite: spotOrderWrite.capability,
        depositRead: depositRead.capability,
        transferRead: transferRead.capability,
        withdrawRead: withdrawRead.capability,
        transferWrite: { state: "unknown" },
        withdrawWrite: { state: "unknown" },
        futuresAccountRead: futuresAccountRead.capability,
        futuresOrderRead: futuresOrderRead.capability,
        futuresOrderWrite: futuresOrderWrite.capability,
      },
      balances: this.balances(account.value?.balances),
      allowedSymbols: this.symbols(symbols.value),
      checkedAt: this.now(),
    };
  }

  private async testSpotOrder() {
    return this.client.spotPrivatePostOrderTest({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "LIMIT",
      timeInForce: "GTC",
      quantity: "0.001",
      price: "10000",
    });
  }

  private async check<T>(operation: () => Promise<T>): Promise<CheckResult<T>> {
    try {
      return {
        capability: { state: "available" },
        value: await operation(),
      };
    } catch (error) {
      const code = this.errorCode(error);
      return {
        capability: {
          state: this.failureState(error, code),
          ...(code ? { code } : {}),
        },
      };
    }
  }

  private profile(value?: SpotAccountResponse) {
    return {
      accountType: value?.accountType ?? null,
      canTrade: value?.canTrade ?? null,
      canWithdraw: value?.canWithdraw ?? null,
      canDeposit: value?.canDeposit ?? null,
      permissions: value?.permissions ?? [],
    };
  }

  private balances(items: SpotAccountResponse["balances"] = []) {
    return items
      .map((item) => {
        const free = new Decimal(item.free ?? 0);
        const locked = new Decimal(item.locked ?? 0);
        return {
          asset: item.asset ?? "UNKNOWN",
          free: free.toFixed(),
          locked: locked.toFixed(),
          total: free.plus(locked).toFixed(),
        };
      })
      .filter((item) => !new Decimal(item.total).isZero())
      .sort((left, right) => left.asset.localeCompare(right.asset));
  }

  private symbols(value?: SymbolsResponse): string[] {
    return Array.isArray(value?.data)
      ? [...new Set(value.data)].sort()
      : [];
  }

  private kyc(value?: KycResponse): ExchangeAccountDetails["kyc"] {
    const rawStatus = value?.status === undefined ? null : String(value.status);
    const levels: Record<string, ExchangeAccountDetails["kyc"]["level"]> = {
      "1": "unverified",
      "2": "primary",
      "3": "advanced",
      "4": "institutional",
    };
    return { level: levels[rawStatus ?? ""] ?? "unknown", rawStatus };
  }

  private errorCode(error: unknown): string | null {
    const message = error instanceof Error ? error.message : String(error);
    return message.match(/"code"\s*:\s*"?(-?\d+)"?/)?.[1] ?? null;
  }

  private failureState(
    error: unknown,
    code: string | null,
  ): CapabilityState {
    const category = error instanceof Error ? error.constructor.name : "";
    return category === "AuthenticationError" ||
        ["401", "403", "700007"].includes(code ?? "")
      ? "unavailable"
      : "unknown";
  }
}
