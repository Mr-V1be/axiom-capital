import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime, Money } from "../common/primitives.js";

export const OrderSide = Type.Union([Type.Literal("buy"), Type.Literal("sell")]);
export const OrderType = Type.Union([
  Type.Literal("market"),
  Type.Literal("limit"),
]);
export const AllocationMode = Type.Union([
  Type.Literal("equity_percentage"),
  Type.Literal("fixed_quote"),
]);

const OrderParameters = Type.Object({
  idempotencyKey: Type.String({ minLength: 16, maxLength: 128 }),
  accountIds: Type.Array(EntityId, { minItems: 1, maxItems: 100 }),
  symbol: Type.String({ pattern: "^[A-Z0-9]{2,12}/[A-Z0-9]{2,12}$" }),
  side: OrderSide,
  type: OrderType,
  limitPrice: Type.Optional(Type.String({ pattern: "^\\d+(\\.\\d+)?$" })),
  leverage: Type.Optional(Type.Integer({ minimum: 1, maximum: 20 })),
  marginMode: Type.Optional(
    Type.Union([Type.Literal("cross"), Type.Literal("isolated")]),
  ),
  reduceOnly: Type.Optional(Type.Boolean()),
});

export const PlaceBatchOrderBody = Type.Intersect([
  OrderParameters,
  Type.Union([
    Type.Object({
      allocationMode: Type.Literal("equity_percentage"),
      allocationPercent: Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
    }),
    Type.Object({
      allocationMode: Type.Literal("fixed_quote"),
      totalQuoteAmount: Type.String({ pattern: "^\\d+(\\.\\d{1,18})?$" }),
    }),
  ]),
]);

export const ExecutionResult = Type.Object({
  accountId: EntityId,
  orderId: Type.Optional(Type.String()),
  status: Type.Union([
    Type.Literal("pending"),
    Type.Literal("accepted"),
    Type.Literal("partially_filled"),
    Type.Literal("filled"),
    Type.Literal("cancelled"),
    Type.Literal("rejected"),
    Type.Literal("failed"),
  ]),
  allocated: Money,
  filled: Money,
  remaining: Money,
  averagePrice: Type.Optional(Type.String()),
  reason: Type.Optional(Type.String()),
});

export const BatchOrderResponse = Type.Object({
  batchId: EntityId,
  symbol: Type.String(),
  side: OrderSide,
  type: OrderType,
  allocationMode: AllocationMode,
  allocationPercent: Type.Number(),
  requestedQuoteAmount: Type.Optional(Money),
  submittedAt: IsoDateTime,
  results: Type.Array(ExecutionResult),
});

export const CancelBatchOrderBody = Type.Object({
  accountIds: Type.Optional(Type.Array(EntityId, { minItems: 1, maxItems: 100 })),
});

export const MarketQuoteQuery = Type.Object({
  symbol: Type.String({ pattern: "^[A-Z0-9]{2,12}/[A-Z0-9]{2,12}$" }),
  marketType: Type.Union([
    Type.Literal("spot"),
    Type.Literal("swap"),
  ]),
});

export const MarketQuoteResponse = Type.Object({
  symbol: Type.String(),
  marketType: Type.Union([
    Type.Literal("spot"),
    Type.Literal("swap"),
  ]),
  price: Type.String(),
  minimumOrderAmount: Type.Union([Type.String(), Type.Null()]),
  contractSize: Type.Union([Type.String(), Type.Null()]),
  changePercent24h: Type.Union([Type.Number(), Type.Null()]),
  quoteVolume24h: Type.Union([Type.String(), Type.Null()]),
  updatedAt: IsoDateTime,
});

export type PlaceBatchOrderInput = Static<typeof PlaceBatchOrderBody>;
export type BatchOrderDto = Static<typeof BatchOrderResponse>;
export type CancelBatchOrderInput = Static<typeof CancelBatchOrderBody>;
export type MarketQuoteDto = Static<typeof MarketQuoteResponse>;
