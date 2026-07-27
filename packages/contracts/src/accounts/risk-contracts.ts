import { Static, Type } from "@sinclair/typebox";
import { EntityId } from "../common/primitives.js";

export const RiskProfileResponse = Type.Object({
  accountId: EntityId,
  maxAllocationPercent: Type.Number({ minimum: 1, maximum: 100 }),
  maxDailyLossPercent: Type.Number({ minimum: 0, maximum: 100 }),
  maxOpenPositions: Type.Integer({ minimum: 1 }),
  allowedSymbols: Type.Array(Type.String()),
  tradingEnabled: Type.Boolean(),
});

export const UpdateRiskProfileBody = Type.Object({
  maxAllocationPercent: Type.Number({ minimum: 1, maximum: 100 }),
});

export type RiskProfileDto = Static<typeof RiskProfileResponse>;
export type UpdateRiskProfileInput = Static<typeof UpdateRiskProfileBody>;
