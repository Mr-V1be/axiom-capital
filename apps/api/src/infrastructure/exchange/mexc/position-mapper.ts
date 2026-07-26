import { Decimal } from "decimal.js";
import { ExchangePosition } from "../../../domain/exchange/exchange-gateway.js";

interface MexcPositionLike {
  id?: string | undefined;
  symbol?: string | undefined;
  side?: string | undefined;
  contracts?: number | undefined;
  contractSize?: number | undefined;
  entryPrice?: number | undefined;
  markPrice?: number | undefined;
  liquidationPrice?: number | undefined;
  leverage?: number | undefined;
  notional?: number | undefined;
  initialMargin?: number | undefined;
  collateral?: number | undefined;
  unrealizedPnl?: number | undefined;
  marginMode?: string | undefined;
  timestamp?: number | undefined;
  info?: Record<string, unknown> | undefined;
}

export class MexcPositionMapper {
  map(position: MexcPositionLike, now: Date): ExchangePosition | null {
    const contracts = decimal(position.contracts);
    const contractSize = decimal(position.contractSize, "1");
    if (!position.symbol || !contracts.greaterThan(0)) return null;

    const info = position.info ?? {};
    const side = this.side(position.side, info.positionType);
    const baseAmount = contracts.times(contractSize);
    const entryPrice = optionalDecimal(position.entryPrice ?? info.holdAvgPrice);
    const unrealizedPnl = optionalDecimal(
      position.unrealizedPnl ?? info.unRealizedPnl,
    );
    const initialMargin = optionalDecimal(
      position.initialMargin ?? position.collateral ?? info.im ?? info.oim,
    );
    const currentPrice = this.currentPrice(
      position.markPrice,
      entryPrice,
      unrealizedPnl,
      baseAmount,
      side,
    );
    const notional = optionalDecimal(position.notional)
      ?? (currentPrice ? baseAmount.times(currentPrice) : null);
    const roe = initialMargin?.isPositive() && unrealizedPnl
      ? unrealizedPnl.div(initialMargin).times(100)
      : optionalDecimal(info.profitRatio)?.times(100) ?? null;

    return {
      id: String(position.id ?? info.positionId ?? `${position.symbol}:${side}`),
      symbol: position.symbol,
      side,
      contracts: contracts.toFixed(),
      contractSize: contractSize.toFixed(),
      baseAmount: baseAmount.toFixed(),
      entryPrice: fixed(entryPrice),
      currentPrice: fixed(currentPrice),
      liquidationPrice: fixed(
        optionalDecimal(position.liquidationPrice ?? info.liquidatePrice),
      ),
      leverage: fixed(optionalDecimal(position.leverage ?? info.leverage)),
      marginMode: this.marginMode(position.marginMode, info.openType),
      notional: fixed(notional),
      initialMargin: fixed(initialMargin),
      unrealizedPnl: fixed(unrealizedPnl),
      realizedPnl: fixed(optionalDecimal(info.realised)),
      roePercent: fixed(roe),
      marginRatioPercent: fixed(
        optionalDecimal(info.marginRatio)?.times(100) ?? null,
      ),
      openedAt: date(position.timestamp ?? info.createTime),
      updatedAt: date(info.updateTime) ?? now,
    };
  }

  private currentPrice(
    markPrice: unknown,
    entryPrice: Decimal | null,
    pnl: Decimal | null,
    baseAmount: Decimal,
    side: "long" | "short",
  ): Decimal | null {
    const mark = optionalDecimal(markPrice);
    if (mark) return mark;
    if (!entryPrice || !pnl || !baseAmount.isPositive()) return null;
    const delta = pnl.div(baseAmount);
    return side === "long" ? entryPrice.plus(delta) : entryPrice.minus(delta);
  }

  private side(value: unknown, positionType: unknown): "long" | "short" {
    if (value === "short" || Number(positionType) === 2) return "short";
    return "long";
  }

  private marginMode(
    value: unknown,
    openType: unknown,
  ): "cross" | "isolated" | null {
    if (value === "cross" || Number(openType) === 2) return "cross";
    if (value === "isolated" || Number(openType) === 1) return "isolated";
    return null;
  }
}

function decimal(value: unknown, fallback = "0"): Decimal {
  try {
    return new Decimal(value === undefined || value === null ? fallback : String(value));
  } catch {
    return new Decimal(fallback);
  }
}

function optionalDecimal(value: unknown): Decimal | null {
  if (value === undefined || value === null || value === "") return null;
  try {
    const result = new Decimal(String(value));
    return result.isFinite() ? result : null;
  } catch {
    return null;
  }
}

function fixed(value: Decimal | null): string | null {
  return value?.toFixed() ?? null;
}

function date(value: unknown): Date | null {
  if (value === undefined || value === null) return null;
  const parsed = new Date(Number(value));
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}
