import ccxt, { mexc } from "ccxt";
import { Decimal } from "decimal.js";
import { AccountCredentials } from "../../domain/accounts/account-ports.js";
import {
  ExchangeGateway,
  ExchangeGatewayFactory,
  ExchangeOrderRequest,
  ExchangeOrderResult,
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
      options: { defaultType: credentials.marketType },
    });
  }

  async verifyReadTradeOnly(credentials: AccountCredentials): Promise<void> {
    try {
      const exchange = this.client(credentials);
      const balance = await exchange.fetchBalance();
      const info = balance.info as MexcAccountInfo;
      if (info.canTrade === false) throw new Error("Trading permission is required");
      if (info.canWithdraw === true) {
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

  async fetchOpenPositions(credentials: AccountCredentials): Promise<number> {
    if (credentials.marketType === "spot") return 0;
    try {
      const positions = await this.client(credentials).fetchPositions();
      return positions.filter((position) =>
        new Decimal(position.contracts ?? 0).isPositive()
      ).length;
    } catch (error) {
      throw this.wrap(error, "Unable to fetch open MEXC positions");
    }
  }

  async placeOrder(
    credentials: AccountCredentials,
    request: ExchangeOrderRequest,
  ) {
    try {
      const exchange = this.client(credentials);
      await exchange.loadMarkets();
      const symbol = this.symbol(request.symbol, credentials.marketType);
      const ticker = request.limitPrice
        ? null
        : await exchange.fetchTicker(symbol);
      const price = request.limitPrice ?? String(ticker?.ask ?? ticker?.last);
      if (!price || new Decimal(price).lessThanOrEqualTo(0)) {
        throw new Error("Unable to resolve executable price");
      }
      const baseAmount = new Decimal(request.quoteAmount).dividedBy(price);
      const market = exchange.market(symbol);
      const amountInUnits = credentials.marketType === "swap"
        ? baseAmount.dividedBy(market.contractSize ?? 1)
        : baseAmount;
      const amount = Number(
        exchange.amountToPrecision(symbol, amountInUnits.toString()),
      );
      const parameters = {
        ...(credentials.marketType === "swap"
          ? { externalOid: request.clientOrderId }
          : { clientOrderId: request.clientOrderId }),
        ...(request.leverage ? { leverage: request.leverage } : {}),
        ...(request.marginMode ? { marginMode: request.marginMode } : {}),
        ...(request.reduceOnly !== undefined
          ? { reduceOnly: request.reduceOnly }
          : {}),
      };
      const result = await exchange.createOrder(
        symbol,
        request.type,
        request.side,
        amount,
        request.type === "limit" ? Number(price) : undefined,
        parameters,
      );
      if (!result.id) throw new Error("Exchange returned no order identifier");
      return this.normalizeOrder(result, request.quoteAmount);
    } catch (error) {
      throw this.wrap(error, "MEXC rejected the order");
    }
  }

  async fetchOrder(
    credentials: AccountCredentials,
    reference: { orderId: string; symbol: string },
  ): Promise<ExchangeOrderResult> {
    try {
      const exchange = this.client(credentials);
      const symbol = this.symbol(reference.symbol, credentials.marketType);
      await exchange.loadMarkets();
      const order = exchange.has.fetchOrder
        ? await exchange.fetchOrder(reference.orderId, symbol)
        : (await exchange.fetchOrders(symbol)).find(
            (item) => String(item.id) === reference.orderId,
          );
      if (!order) throw new Error("Order was not found on MEXC");
      return this.normalizeOrder(order);
    } catch (error) {
      throw this.wrap(error, "Unable to synchronize MEXC order");
    }
  }

  async cancelOrder(
    credentials: AccountCredentials,
    reference: { orderId: string; symbol: string },
  ): Promise<ExchangeOrderResult> {
    try {
      const exchange = this.client(credentials);
      const symbol = this.symbol(reference.symbol, credentials.marketType);
      await exchange.loadMarkets();
      await exchange.cancelOrder(reference.orderId, symbol);
      return await this.fetchOrder(credentials, reference);
    } catch (error) {
      throw this.wrap(error, "Unable to cancel MEXC order");
    }
  }

  private normalizeOrder(
    order: {
      id?: string | undefined;
      status?: string | undefined;
      filled?: number | undefined;
      remaining?: number | undefined;
      cost?: number | undefined;
      average?: number | undefined;
      price?: number | undefined;
    },
    requestedQuote?: string,
  ): ExchangeOrderResult {
    if (!order.id) throw new Error("Exchange returned no order identifier");
    const price = new Decimal(order.average ?? order.price ?? 0);
    const filled = order.cost !== undefined
      ? new Decimal(order.cost)
      : new Decimal(order.filled ?? 0).times(price);
    const remaining = requestedQuote
      ? Decimal.max(new Decimal(requestedQuote).minus(filled), 0)
      : new Decimal(order.remaining ?? 0).times(price);
    const status = order.status === "canceled"
      ? "cancelled"
      : order.status === "closed"
        ? "filled"
        : filled.isPositive()
          ? "partially_filled"
          : "accepted";
    return {
      orderId: String(order.id),
      status,
      filledQuote: filled.toFixed(),
      remainingQuote: remaining.toFixed(),
      ...(price.isPositive() ? { averagePrice: price.toFixed() } : {}),
    };
  }

  private symbol(symbol: string, marketType: "spot" | "swap"): string {
    if (marketType === "spot" || symbol.includes(":")) return symbol;
    const quote = symbol.split("/")[1];
    if (!quote) throw new Error(`Invalid swap symbol: ${symbol}`);
    return `${symbol}:${quote}`;
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
