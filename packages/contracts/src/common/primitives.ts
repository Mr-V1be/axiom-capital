import { Type } from "@sinclair/typebox";

export const EntityId = Type.String({
  minLength: 20,
  maxLength: 64,
  pattern: "^[A-Za-z0-9_-]+$",
});

export const IsoDateTime = Type.String({ format: "date-time" });

export const Money = Type.Object({
  amount: Type.String({ pattern: "^-?\\d+(\\.\\d{1,18})?$" }),
  currency: Type.String({ minLength: 2, maxLength: 12 }),
});

export const ApiError = Type.Object({
  code: Type.String(),
  message: Type.String(),
  requestId: Type.String(),
  details: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});

export const PageQuery = Type.Object({
  cursor: Type.Optional(Type.String()),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 25 })),
});
