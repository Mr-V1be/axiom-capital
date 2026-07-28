import { Decimal } from "decimal.js";
import { ExchangeOrderResult } from "../../../domain/exchange/exchange-gateway.js";

export interface MexcOrderLike {
  id?: string | undefined;
  status?: string | undefined;
  amount?: number | undefined;
  filled?: number | undefined;
  remaining?: number | undefined;
  cost?: number | undefined;
  average?: number | undefined;
  price?: number | undefined;
  info?: Record<string, unknown> | undefined;
}

export interface MexcActivityOrderLike {
  side?: string | undefined;
  type?: string | undefined;
  reduceOnly?: boolean | undefined;
  info?: Record<string, unknown> | undefined;
}

export class MexcOrderNormalizer {
  normalize(
    order: MexcOrderLike,
    marketType: "spot" | "swap",
    requestedQuote?: string,
  ): ExchangeOrderResult {
    if (!order.id) throw new Error("Exchange returned no order identifier");
    return marketType === "swap"
      ? this.swap(order, requestedQuote)
      : this.spot(order, requestedQuote);
  }

  private spot(order: MexcOrderLike, requestedQuote?: string) {
    const price = decimal(order.average ?? order.price);
    const filled = order.cost !== undefined
      ? decimal(order.cost)
      : decimal(order.filled).times(price);
    const status = normalizeStatus(order.status, filled.isPositive());
    const remaining = requestedQuote
      ? Decimal.max(decimal(requestedQuote).minus(filled), 0)
      : decimal(order.remaining).times(price);
    return result(order, status, filled, remaining, price);
  }

  private swap(order: MexcOrderLike, requestedQuote?: string) {
    const info = order.info ?? {};
    const price = decimal(order.average ?? order.price ?? info.price);
    const totalContracts = decimal(info.vol ?? order.amount);
    const filledContracts = decimal(info.dealVol ?? order.filled);
    const fillRatio = totalContracts.greaterThan(0)
      ? Decimal.min(Decimal.max(filledContracts.div(totalContracts), 0), 1)
      : new Decimal(order.status === "closed" ? 1 : 0);
    const reportedMargin = optionalDecimal(
      info.orderMargin ?? info.usedMargin ?? info.im,
    );
    const allocated = requestedQuote
      ? decimal(requestedQuote)
      : reportedMargin ?? new Decimal(0);
    const status = normalizeStatus(order.status, fillRatio.greaterThan(0));
    const filled = status === "filled" && reportedMargin
      ? reportedMargin
      : allocated.times(fillRatio);
    const remaining = status === "filled" || status === "cancelled"
      ? new Decimal(0)
      : Decimal.max(allocated.minus(filled), 0);
    return result(order, status, filled, remaining, price);
  }
}

export function normalizeActivityOrder(order: MexcActivityOrderLike): {
  side: "buy" | "sell";
  type: string;
  reduceOnly: boolean;
} {
  const rawSide = String(order.info?.side ?? "");
  const rawType = String(order.info?.orderType ?? "");
  return {
    side: normalizeMexcSide(rawSide, order.side),
    type: swapOrderType(rawType) ?? order.type ?? "unknown",
    reduceOnly: rawSide === "2" || rawSide === "4" ||
      order.reduceOnly === true,
  };
}

export function normalizeMexcSide(
  rawSide: unknown,
  fallback?: unknown,
): "buy" | "sell" {
  const value = String(rawSide ?? "");
  if (value === "3" || value === "4") return "sell";
  if (value === "1" || value === "2") return "buy";
  return fallback === "sell" ? "sell" : "buy";
}

function swapOrderType(value: string): string | null {
  if (value === "1" || value === "2") return "limit";
  if (value === "3") return "ioc";
  if (value === "4") return "fok";
  if (value === "5" || value === "6") return "market";
  return null;
}

function normalizeStatus(
  value: string | undefined,
  hasFill: boolean,
): ExchangeOrderResult["status"] {
  if (value === "canceled" || value === "cancelled") return "cancelled";
  if (value === "closed") return "filled";
  return hasFill ? "partially_filled" : "accepted";
}

function result(
  order: MexcOrderLike,
  status: ExchangeOrderResult["status"],
  filled: Decimal,
  remaining: Decimal,
  price: Decimal,
): ExchangeOrderResult {
  return {
    orderId: String(order.id),
    status,
    filledQuote: filled.toFixed(),
    remainingQuote: remaining.toFixed(),
    ...(price.greaterThan(0) ? { averagePrice: price.toFixed() } : {}),
  };
}

function decimal(value: unknown): Decimal {
  if (value === undefined || value === null || value === "") return new Decimal(0);
  try {
    return new Decimal(String(value));
  } catch {
    return new Decimal(0);
  }
}

function optionalDecimal(value: unknown): Decimal | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = decimal(value);
  return parsed.isFinite() ? parsed : null;
}
