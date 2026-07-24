import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime, Money } from "../common/primitives.js";

export const ExchangeName = Type.Union([Type.Literal("mexc")]);
export const AccountScope = Type.Union([
  Type.Literal("standalone"),
  Type.Literal("subaccount"),
]);
export const MarketType = Type.Union([
  Type.Literal("spot"),
  Type.Literal("swap"),
]);
export const AccountStatus = Type.Union([
  Type.Literal("pending"),
  Type.Literal("connected"),
  Type.Literal("degraded"),
  Type.Literal("disabled"),
]);

export const InvestorAccount = Type.Object({
  id: EntityId,
  label: Type.String({ minLength: 2, maxLength: 80 }),
  investorName: Type.String({ minLength: 2, maxLength: 120 }),
  exchange: ExchangeName,
  accountScope: AccountScope,
  marketType: MarketType,
  externalAccountId: Type.Optional(Type.String({ minLength: 2, maxLength: 128 })),
  status: AccountStatus,
  equity: Money,
  pnlToday: Money,
  pnlTotal: Money,
  permissions: Type.Object({
    read: Type.Boolean(),
    trade: Type.Boolean(),
    withdraw: Type.Literal(false),
  }),
  lastSyncedAt: Type.Optional(IsoDateTime),
  createdAt: IsoDateTime,
});

export const ConnectAccountBody = Type.Object({
  label: Type.String({ minLength: 2, maxLength: 80 }),
  investorName: Type.String({ minLength: 2, maxLength: 120 }),
  exchange: ExchangeName,
  accountScope: AccountScope,
  marketType: MarketType,
  externalAccountId: Type.Optional(Type.String({ minLength: 2, maxLength: 128 })),
  apiKey: Type.String({ minLength: 16, maxLength: 256 }),
  secret: Type.String({ minLength: 16, maxLength: 256 }),
  withdrawDisabledConfirmed: Type.Literal(true),
});

export const AccountListResponse = Type.Object({
  items: Type.Array(InvestorAccount),
  nextCursor: Type.Optional(Type.String()),
});

export type InvestorAccountDto = Static<typeof InvestorAccount>;
export type ConnectAccountInput = Static<typeof ConnectAccountBody>;
export type AccountListDto = Static<typeof AccountListResponse>;
