import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime } from "../common/primitives.js";

const NullableDecimal = Type.Union([Type.String(), Type.Null()]);

export const PositionResponse = Type.Object({
  id: Type.String(),
  accountId: EntityId,
  accountLabel: Type.String(),
  investorName: Type.String(),
  symbol: Type.String(),
  side: Type.Union([Type.Literal("long"), Type.Literal("short")]),
  contracts: Type.String(),
  contractSize: Type.String(),
  baseAmount: Type.String(),
  entryPrice: NullableDecimal,
  currentPrice: NullableDecimal,
  liquidationPrice: NullableDecimal,
  leverage: NullableDecimal,
  marginMode: Type.Union([
    Type.Literal("cross"),
    Type.Literal("isolated"),
    Type.Null(),
  ]),
  notional: NullableDecimal,
  initialMargin: NullableDecimal,
  unrealizedPnl: NullableDecimal,
  realizedPnl: NullableDecimal,
  roePercent: NullableDecimal,
  marginRatioPercent: NullableDecimal,
  openedAt: Type.Union([IsoDateTime, Type.Null()]),
  updatedAt: IsoDateTime,
});

export const PositionFailureResponse = Type.Object({
  accountId: EntityId,
  accountLabel: Type.String(),
  message: Type.String(),
});

export const PositionListResponse = Type.Object({
  items: Type.Array(PositionResponse),
  failures: Type.Array(PositionFailureResponse),
  updatedAt: IsoDateTime,
});

export type PositionDto = Static<typeof PositionResponse>;
export type PositionListDto = Static<typeof PositionListResponse>;
