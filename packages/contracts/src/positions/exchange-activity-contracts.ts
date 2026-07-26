import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime } from "../common/primitives.js";

const NullableDecimal = Type.Union([Type.String(), Type.Null()]);

export const ExchangeOrderResponse = Type.Object({
  id: Type.String(),
  accountId: EntityId,
  accountLabel: Type.String(),
  symbol: Type.String(),
  side: Type.Union([Type.Literal("buy"), Type.Literal("sell")]),
  type: Type.String(),
  status: Type.String(),
  amount: Type.String(),
  filled: Type.String(),
  remaining: Type.String(),
  price: NullableDecimal,
  averagePrice: NullableDecimal,
  reduceOnly: Type.Boolean(),
  createdAt: Type.Union([IsoDateTime, Type.Null()]),
  updatedAt: Type.Union([IsoDateTime, Type.Null()]),
});

export const ExchangeTradeResponse = Type.Object({
  id: Type.String(),
  accountId: EntityId,
  accountLabel: Type.String(),
  orderId: Type.Union([Type.String(), Type.Null()]),
  symbol: Type.String(),
  side: Type.Union([Type.Literal("buy"), Type.Literal("sell")]),
  price: Type.String(),
  amount: Type.String(),
  cost: Type.String(),
  fee: NullableDecimal,
  feeCurrency: Type.Union([Type.String(), Type.Null()]),
  realizedPnl: NullableDecimal,
  createdAt: Type.Union([IsoDateTime, Type.Null()]),
});

export const ExchangeActivityResponse = Type.Object({
  openOrders: Type.Array(ExchangeOrderResponse),
  recentOrders: Type.Array(ExchangeOrderResponse),
  recentTrades: Type.Array(ExchangeTradeResponse),
  failures: Type.Array(Type.Object({
    accountId: EntityId,
    accountLabel: Type.String(),
    message: Type.String(),
  })),
  updatedAt: IsoDateTime,
});

export const CancelExchangeOrderBody = Type.Object({
  accountId: EntityId,
  symbol: Type.String(),
  idempotencyKey: Type.String({ minLength: 16, maxLength: 128 }),
  confirmed: Type.Literal(true),
});

export const CancelExchangeOrderParams = Type.Object({
  orderId: Type.String({ minLength: 1, maxLength: 128 }),
});

export const ExchangeCommandResponse = Type.Object({
  commandId: EntityId,
  status: Type.Union([
    Type.Literal("completed"),
    Type.Literal("failed"),
    Type.Literal("in_progress"),
  ]),
  references: Type.Array(Type.String()),
  message: Type.String(),
});

export type ExchangeActivityDto = Static<typeof ExchangeActivityResponse>;
export type CancelExchangeOrderInput = Static<typeof CancelExchangeOrderBody>;
export type ExchangeCommandDto = Static<typeof ExchangeCommandResponse>;
