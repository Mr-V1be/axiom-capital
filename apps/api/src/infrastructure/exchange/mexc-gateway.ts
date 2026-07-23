import ccxt, { mexc } from "ccxt";
import { Decimal } from "decimal.js";
import { AccountCredentials } from "../../domain/accounts/account-ports.js";
import {
  ExchangeGateway,
  ExchangeGatewayFactory,
  ExchangeOrderRequest,
} from "../../domain/exchange/exchange-gateway.js";
import { ExternalServiceError } from "../../domain/shared/domain-error.js";

interface MexcAccountInfo {
  canTrade?: boolean;
  canWithdraw?: boolean;
}

export class MexcGateway implements ExchangeGateway {
  private client(credentials: AccountCredentials): mexc {
    return new ccxt.mexc({
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      enableRateLimit: true,
      options: { defaultType: "spot" },
    });
  }

  async verifyReadTradeOnly(credentials: AccountCredentials): Promise<void> {
    try {
      const exchange = this.client(credentials);
      const balance = await exchange.fetchBalance();
      const info = balance.info as MexcAccountInfo;
      if (info.canTrade !== true) throw new Error("Trading permission is required");
      if (info.canWithdraw !== false) {
        throw new Error("Withdrawal permission must be explicitly disabled");
      }
    } catch (error) {
      throw this.wrap(error, "Unable to verify MEXC API permissions");
    }
  }

  async fetchBalance(credentials: AccountCredentials) {
    try {
      const balance = await this.client(credentials).fetchBalance();
      const totals = Object.fromEntries(
        Object.entries(balance.total ?? {})
          .filter((entry): entry is [string, number] => typeof entry[1] === "number")
          .map(([currency, amount]) => [currency, String(amount)]),
      );
      return {
        currency: "USDT",
        equity: totals.USDT ?? "0",
        balances: totals,
      };
    } catch (error) {
      throw this.wrap(error, "Unable to fetch MEXC balance");
    }
  }

  async placeOrder(
    credentials: AccountCredentials,
    request: ExchangeOrderRequest,
  ) {
    try {
      const exchange = this.client(credentials);
      await exchange.loadMarkets();
      const ticker = await exchange.fetchTicker(request.symbol);
      const price = request.limitPrice ?? String(ticker.ask ?? ticker.last);
      if (!price || new Decimal(price).lessThanOrEqualTo(0)) {
        throw new Error("Unable to resolve executable price");
      }
      const baseAmount = new Decimal(request.quoteAmount).dividedBy(price);
      const amount = Number(exchange.amountToPrecision(request.symbol, baseAmount.toString()));
      const result = await exchange.createOrder(
        request.symbol,
        request.type,
        request.side,
        amount,
        request.type === "limit" ? Number(price) : undefined,
        { clientOrderId: request.clientOrderId },
      );
      if (!result.id) throw new Error("Exchange returned no order identifier");
      return {
        orderId: String(result.id),
        status: result.status === "closed" ? "filled" as const : "accepted" as const,
      };
    } catch (error) {
      throw this.wrap(error, "MEXC rejected the order");
    }
  }

  private wrap(error: unknown, message: string): ExternalServiceError {
    return new ExternalServiceError("mexc", message, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}

export class DefaultExchangeGatewayFactory implements ExchangeGatewayFactory {
  constructor(private readonly mexcGateway: ExchangeGateway) {}

  for(exchange: "mexc"): ExchangeGateway {
    if (exchange === "mexc") return this.mexcGateway;
    throw new Error(`Unsupported exchange: ${exchange satisfies never}`);
  }
}
