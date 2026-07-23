import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime, Money } from "../common/primitives.js";

export const OrderSide = Type.Union([Type.Literal("buy"), Type.Literal("sell")]);
export const OrderType = Type.Union([
  Type.Literal("market"),
  Type.Literal("limit"),
]);

export const PlaceBatchOrderBody = Type.Object({
  idempotencyKey: Type.String({ minLength: 16, maxLength: 128 }),
  accountIds: Type.Array(EntityId, { minItems: 1, maxItems: 100 }),
  symbol: Type.String({ pattern: "^[A-Z0-9]{2,12}/[A-Z0-9]{2,12}$" }),
  side: OrderSide,
  type: OrderType,
  allocationPercent: Type.Number({ exclusiveMinimum: 0, maximum: 100 }),
  limitPrice: Type.Optional(Type.String({ pattern: "^\\d+(\\.\\d+)?$" })),
});

export const ExecutionResult = Type.Object({
  accountId: EntityId,
  orderId: Type.Optional(Type.String()),
  status: Type.Union([
    Type.Literal("accepted"),
    Type.Literal("rejected"),
    Type.Literal("failed"),
  ]),
  allocated: Money,
  reason: Type.Optional(Type.String()),
});

export const BatchOrderResponse = Type.Object({
  batchId: EntityId,
  submittedAt: IsoDateTime,
  results: Type.Array(ExecutionResult),
});

export type PlaceBatchOrderInput = Static<typeof PlaceBatchOrderBody>;
export type BatchOrderDto = Static<typeof BatchOrderResponse>;
