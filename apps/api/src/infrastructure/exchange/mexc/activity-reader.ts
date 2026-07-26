import { mexc, Order, Trade } from "ccxt";
import {
  ExchangeActivity,
  ExchangeActivityOrder,
  ExchangeActivityTrade,
} from "../../../domain/exchange/exchange-gateway.js";

export class MexcActivityReader {
  constructor(private readonly exchange: mexc) {}

  async read(): Promise<ExchangeActivity> {
    await this.exchange.loadMarkets();
    const [openOrders, recentOrders, positions] = await Promise.all([
      this.exchange.fetchOpenOrders(undefined, undefined, 100, { type: "swap" }),
      this.exchange.fetchClosedOrders(undefined, undefined, 100, { type: "swap" }),
      this.exchange.fetchPositions(),
    ]);
    const symbols = new Set([
      ...openOrders.map((order) => order.symbol),
      ...recentOrders.map((order) => order.symbol),
      ...positions.map((position) => position.symbol),
    ].filter((symbol): symbol is string => Boolean(symbol)));
    const tradePages = await Promise.all(
      [...symbols].slice(0, 20).map((symbol) =>
        this.exchange.fetchMyTrades(symbol, undefined, 100, { type: "swap" })
      ),
    );
    return {
      openOrders: openOrders.map(mapOrder),
      recentOrders: recentOrders.map(mapOrder),
      recentTrades: tradePages
        .flat()
        .map(mapTrade)
        .sort((left, right) =>
          (right.createdAt?.valueOf() ?? 0) - (left.createdAt?.valueOf() ?? 0)
        )
        .slice(0, 100),
    };
  }
}

function mapOrder(order: Order): ExchangeActivityOrder {
  return {
    id: String(order.id),
    symbol: order.symbol ?? "—",
    side: order.side === "sell" ? "sell" : "buy",
    type: order.type ?? "unknown",
    status: order.status ?? "unknown",
    amount: decimal(order.amount),
    filled: decimal(order.filled),
    remaining: decimal(order.remaining),
    price: optionalDecimal(order.price),
    averagePrice: optionalDecimal(order.average),
    reduceOnly: order.reduceOnly === true,
    createdAt: date(order.timestamp),
    updatedAt: date(order.lastTradeTimestamp ?? order.timestamp),
  };
}

function mapTrade(trade: Trade): ExchangeActivityTrade {
  const info = trade.info as Record<string, unknown> | undefined;
  return {
    id: String(trade.id),
    orderId: trade.order ? String(trade.order) : null,
    symbol: trade.symbol ?? "—",
    side: trade.side === "sell" ? "sell" : "buy",
    price: decimal(trade.price),
    amount: decimal(trade.amount),
    cost: decimal(trade.cost),
    fee: optionalDecimal(trade.fee?.cost),
    feeCurrency: trade.fee?.currency ?? null,
    realizedPnl: optionalDecimal(info?.profit ?? info?.realisedPnl),
    createdAt: date(trade.timestamp),
  };
}

function decimal(value: unknown): string {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : "0";
}

function optionalDecimal(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? String(parsed) : null;
}

function date(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  const parsed = new Date(Number(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}
