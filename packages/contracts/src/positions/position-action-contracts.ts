import { Static, Type } from "@sinclair/typebox";
import { EntityId } from "../common/primitives.js";

const PositiveDecimal = Type.String({ pattern: "^\\d+(\\.\\d{1,18})?$" });
const CommandBase = Type.Object({
  idempotencyKey: Type.String({ minLength: 16, maxLength: 128 }),
  confirmed: Type.Literal(true),
});

export const PositionActionBody = Type.Intersect([
  CommandBase,
  Type.Union([
    Type.Object({
      action: Type.Literal("close"),
      contracts: PositiveDecimal,
      orderType: Type.Union([
        Type.Literal("market"),
        Type.Literal("limit"),
      ]),
      limitPrice: Type.Optional(PositiveDecimal),
    }),
    Type.Object({
      action: Type.Literal("set_leverage"),
      leverage: Type.Integer({ minimum: 1, maximum: 200 }),
    }),
    Type.Object({
      action: Type.Literal("adjust_margin"),
      direction: Type.Union([Type.Literal("add"), Type.Literal("reduce")]),
      amount: PositiveDecimal,
    }),
    Type.Object({
      action: Type.Literal("place_protection"),
      protectionType: Type.Union([
        Type.Literal("take_profit"),
        Type.Literal("stop_loss"),
      ]),
      triggerPrice: PositiveDecimal,
      contracts: PositiveDecimal,
      priceSource: Type.Union([
        Type.Literal("last"),
        Type.Literal("mark"),
        Type.Literal("index"),
      ]),
    }),
  ]),
]);

export const PositionActionParams = Type.Object({
  accountId: EntityId,
  positionId: Type.String({ minLength: 1, maxLength: 128 }),
});

export const PositionActionResponse = Type.Object({
  commandId: EntityId,
  action: Type.String(),
  status: Type.Union([
    Type.Literal("completed"),
    Type.Literal("failed"),
    Type.Literal("in_progress"),
  ]),
  references: Type.Array(Type.String()),
  message: Type.String(),
});

export type PositionActionInput = Static<typeof PositionActionBody>;
export type PositionActionDto = Static<typeof PositionActionResponse>;
