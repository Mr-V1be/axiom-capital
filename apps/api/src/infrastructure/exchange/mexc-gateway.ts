import ccxt, { mexc } from "ccxt";
import { Decimal } from "decimal.js";
import { AccountCredentials } from "../../domain/accounts/account-ports.js";
import { AccountAccessMode } from "../../domain/accounts/investor-account.js";
import {
  ExchangeGateway,
  ExchangeOrderRequest,
  ExchangeOrderResult,
  PositionActionRequest,
} from "../../domain/exchange/exchange-gateway.js";
import { ExternalServiceError } from "../../domain/shared/domain-error.js";
import { MexcAccountInspector } from "./mexc-account-inspector.js";
import { MexcMarketData } from "./mexc-market-data.js";
import { MexcOrderSizer } from "./mexc-order-sizer.js";
import { MexcOrderNormalizer } from "./mexc/order-normalizer.js";
import { MexcPositionMapper } from "./mexc/position-mapper.js";
import { MexcActivityReader } from "./mexc/activity-reader.js";
import { MexcPositionController, validatePositionAction } from "./mexc/position-controller.js";
import { toMexcExternalOrderId } from "./mexc/external-order-id.js";
interface MexcAccountInfo {
  canTrade?: boolean;
  canWithdraw?: boolean;
}
export class MexcGateway implements ExchangeGateway {
  private readonly orderSizer = new MexcOrderSizer();
  private readonly orderNormalizer = new MexcOrderNormalizer();
  private readonly positionMapper = new MexcPositionMapper();
  private client(credentials: AccountCredentials): mexc {
    return new ccxt.mexc({
      apiKey: credentials.apiKey,
      secret: credentials.secret,
      enableRateLimit: true,
      options: { defaultType: credentials.marketType },
    });
  }
  async verifyAccess(
    credentials: AccountCredentials,
    accessMode: AccountAccessMode,
  ): Promise<void> {
    try {
      const exchange = this.client(credentials);
      const balance = await exchange.fetchBalance();
      const info = balance.info as MexcAccountInfo;
      if (accessMode === "trade") {
        if (info.canTrade === false) {
          throw new Error("Trading permission is required");
        }
        await this.verifyTradePermission(exchange, credentials.marketType);
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
    return (await this.fetchPositions(credentials)).length;
  }

  async fetchPositions(credentials: AccountCredentials) {
    if (credentials.marketType === "spot") return [];
    try {
      const positions = await this.client(credentials).fetchPositions();
      const now = new Date();
      return positions.flatMap((position) => {
        const mapped = this.positionMapper.map(position, now);
        return mapped ? [mapped] : [];
      });
    } catch (error) {
      throw this.wrap(error, "Unable to fetch open MEXC positions");
    }
  }

  async fetchActivity(credentials: AccountCredentials) {
    if (credentials.marketType !== "swap") {
      return { openOrders: [], recentOrders: [], recentTrades: [] };
    }
    try {
      return await new MexcActivityReader(this.client(credentials)).read();
    } catch (error) {
      throw this.wrap(error, "Unable to fetch MEXC futures activity");
    }
  }

  async fetchAccountDetails(credentials: AccountCredentials) {
    return new MexcAccountInspector(this.client(credentials)).inspect();
  }

  async fetchMarketQuote(symbol: string, marketType: "spot" | "swap") {
    return new MexcMarketData().fetchQuote(symbol, marketType);
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
      const market = exchange.market(symbol);
      const { amount } = this.orderSizer.calculate({
        marketType: credentials.marketType,
        quoteAmount: request.quoteAmount,
        price,
        ...(request.leverage ? { leverage: request.leverage } : {}),
        ...(market.contractSize ? { contractSize: market.contractSize } : {}),
        ...(market.limits.amount?.min
          ? { minimumAmount: market.limits.amount.min }
          : {}),
        amountToPrecision: (value) => exchange.amountToPrecision(symbol, value),
      });
      const parameters = {
        ...(credentials.marketType === "swap"
          ? { externalOid: toMexcExternalOrderId(request.clientOrderId) }
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
      return this.orderNormalizer.normalize(
        result,
        credentials.marketType,
        request.quoteAmount,
      );
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
      return this.orderNormalizer.normalize(order, credentials.marketType);
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
      return cancelledOrder(reference.orderId);
    } catch (error) {
      throw this.wrap(error, "Unable to cancel MEXC order");
    }
  }

  async executePositionAction(
    credentials: AccountCredentials,
    request: PositionActionRequest,
  ) {
    try {
      if (credentials.marketType !== "swap") {
        throw new Error("Position controls require a futures account");
      }
      validatePositionAction(request);
      return await new MexcPositionController(this.client(credentials))
        .execute(request);
    } catch (error) {
      throw this.wrap(error, "MEXC rejected the position command");
    }
  }

  private symbol(symbol: string, marketType: "spot" | "swap"): string {
    if (marketType === "spot" || symbol.includes(":")) return symbol;
    const quote = symbol.split("/")[1];
    if (!quote) throw new Error(`Invalid swap symbol: ${symbol}`);
    return `${symbol}:${quote}`;
  }

  private async verifyTradePermission(
    exchange: mexc,
    marketType: "spot" | "swap",
  ): Promise<void> {
    if (marketType === "swap") {
      await exchange.contractPrivateGetPositionPositionMode();
      return;
    }
    await exchange.spotPrivatePostOrderTest({
      symbol: "BTCUSDT",
      side: "BUY",
      type: "LIMIT",
      timeInForce: "GTC",
      quantity: "0.001",
      price: "10000",
    });
  }

  private wrap(error: unknown, message: string): ExternalServiceError {
    return new ExternalServiceError("mexc", message, {
      cause: error instanceof Error ? error : undefined,
    });
  }
}
const cancelledOrder = (orderId: string): ExchangeOrderResult =>
  ({ orderId, status: "cancelled", filledQuote: "0", remainingQuote: "0" });
