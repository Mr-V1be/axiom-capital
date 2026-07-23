import { Static, Type } from "@sinclair/typebox";
import { IsoDateTime, Money } from "../common/primitives.js";

export const EquityPoint = Type.Object({
  at: IsoDateTime,
  value: Type.String({ pattern: "^\\d+(\\.\\d+)?$" }),
});

export const PortfolioOverview = Type.Object({
  totalEquity: Money,
  pnlToday: Money,
  pnlMonth: Money,
  activeAccounts: Type.Integer({ minimum: 0 }),
  connectedAccounts: Type.Integer({ minimum: 0 }),
  maxDrawdownPercent: Type.Number({ minimum: 0 }),
  equityCurve: Type.Array(EquityPoint),
  updatedAt: IsoDateTime,
});

export type PortfolioOverviewDto = Static<typeof PortfolioOverview>;
