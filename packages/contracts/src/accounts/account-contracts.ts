import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime, Money } from "../common/primitives.js";
import { RiskProfileResponse } from "./risk-contracts.js";

export const ExchangeName = Type.Union([Type.Literal("mexc")]);
export const AccountScope = Type.Union([
  Type.Literal("standalone"),
  Type.Literal("subaccount"),
]);
export const MarketType = Type.Union([
  Type.Literal("spot"),
  Type.Literal("swap"),
]);
export const AccountAccessMode = Type.Union([
  Type.Literal("read_only"),
  Type.Literal("trade"),
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
  accessMode: AccountAccessMode,
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
  riskProfile: Type.Optional(RiskProfileResponse),
  lastSyncedAt: Type.Optional(IsoDateTime),
  createdAt: IsoDateTime,
});

export const ConnectAccountBody = Type.Object({
  label: Type.String({ minLength: 2, maxLength: 80 }),
  investorName: Type.String({ minLength: 2, maxLength: 120 }),
  exchange: ExchangeName,
  accountScope: AccountScope,
  marketType: MarketType,
  accessMode: AccountAccessMode,
  externalAccountId: Type.Optional(Type.String({ minLength: 2, maxLength: 128 })),
  apiKey: Type.String({ minLength: 16, maxLength: 256 }),
  secret: Type.String({ minLength: 16, maxLength: 256 }),
  withdrawDisabledConfirmed: Type.Literal(true),
});

export const UpdateAccountAccessBody = Type.Object({
  accessMode: AccountAccessMode,
});

export const AccountListResponse = Type.Object({
  items: Type.Array(InvestorAccount),
  nextCursor: Type.Optional(Type.String()),
});

export const CapabilityState = Type.Union([
  Type.Literal("available"),
  Type.Literal("unavailable"),
  Type.Literal("unknown"),
]);

const Capability = Type.Object({
  state: CapabilityState,
  code: Type.Optional(Type.String()),
});

export const AccountDetailsResponse = Type.Object({
  account: InvestorAccount,
  profile: Type.Object({
    accountType: Type.Union([Type.String(), Type.Null()]),
    canTrade: Type.Union([Type.Boolean(), Type.Null()]),
    canWithdraw: Type.Union([Type.Boolean(), Type.Null()]),
    canDeposit: Type.Union([Type.Boolean(), Type.Null()]),
    permissions: Type.Array(Type.String()),
  }),
  kyc: Type.Object({
    level: Type.Union([
      Type.Literal("unverified"),
      Type.Literal("primary"),
      Type.Literal("advanced"),
      Type.Literal("institutional"),
      Type.Literal("unknown"),
    ]),
    rawStatus: Type.Union([Type.String(), Type.Null()]),
  }),
  capabilities: Type.Object({
    spotAccountRead: Capability,
    spotOrderRead: Capability,
    spotOrderWrite: Capability,
    depositRead: Capability,
    transferRead: Capability,
    withdrawRead: Capability,
    transferWrite: Capability,
    withdrawWrite: Capability,
    futuresAccountRead: Capability,
    futuresOrderRead: Capability,
    futuresOrderWrite: Capability,
  }),
  balances: Type.Array(Type.Object({
    asset: Type.String(),
    free: Type.String(),
    locked: Type.String(),
    total: Type.String(),
  })),
  allowedSymbols: Type.Array(Type.String()),
  checkedAt: IsoDateTime,
});

export type InvestorAccountDto = Static<typeof InvestorAccount>;
export type ConnectAccountInput = Static<typeof ConnectAccountBody>;
export type UpdateAccountAccessInput = Static<typeof UpdateAccountAccessBody>;
export type AccountListDto = Static<typeof AccountListResponse>;
export type AccountDetailsDto = Static<typeof AccountDetailsResponse>;
