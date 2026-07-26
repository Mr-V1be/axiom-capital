import { Static, Type } from "@sinclair/typebox";
import { EntityId, IsoDateTime, Money } from "../common/primitives.js";

export const SettlementStatus = Type.Union([
  Type.Literal("calculated"),
  Type.Literal("awaiting_investor"),
  Type.Literal("funded"),
  Type.Literal("distributed"),
  Type.Literal("cancelled"),
]);

export const Settlement = Type.Object({
  id: EntityId,
  accountId: EntityId,
  investorName: Type.String(),
  periodStart: IsoDateTime,
  periodEnd: IsoDateTime,
  grossProfit: Money,
  investorShare: Money,
  traderShare: Money,
  traderSharePercent: Type.Number({ minimum: 0, maximum: 100 }),
  highWaterMark: Money,
  splitAddress: Type.Optional(Type.String()),
  status: SettlementStatus,
  createdAt: IsoDateTime,
});

export const CreateSettlementBody = Type.Object({
  accountId: EntityId,
  periodEnd: IsoDateTime,
  traderSharePercent: Type.Number({ minimum: 0, maximum: 50 }),
});

export const SettlementListResponse = Type.Object({
  items: Type.Array(Settlement),
  nextCursor: Type.Optional(Type.String()),
});

const EvmAddress = Type.String({ pattern: "^0x[a-fA-F0-9]{40}$" });
const TransactionHash = Type.String({ pattern: "^0x[a-fA-F0-9]{64}$" });

export const SplitConfiguration = Type.Object({
  accountId: EntityId,
  chainId: Type.Integer({ minimum: 1 }),
  networkName: Type.String(),
  environment: Type.Union([
    Type.Literal("testnet"),
    Type.Literal("mainnet"),
  ]),
  address: EvmAddress,
  immutable: Type.Literal(true),
  investorAddress: EvmAddress,
  traderAddress: EvmAddress,
  traderSharePercent: Type.Number({ minimum: 0, maximum: 100 }),
  splitType: Type.Union([Type.Literal("push"), Type.Literal("pull")]),
  protocolVersion: Type.String(),
  deploymentTxHash: Type.Optional(TransactionHash),
  verifiedAt: IsoDateTime,
});

export const SplitNetworkStatus = Type.Object({
  mode: Type.Union([
    Type.Literal("disabled"),
    Type.Literal("test_fork"),
  ]),
  connected: Type.Boolean(),
  factoryDeployed: Type.Boolean(),
  chainId: Type.Optional(Type.Integer({ minimum: 1 })),
  networkName: Type.Optional(Type.String()),
  blockNumber: Type.Optional(Type.String()),
  signerAddress: Type.Optional(EvmAddress),
  signerBalanceWei: Type.Optional(Type.String()),
});

export const SplitOverview = Type.Object({
  network: SplitNetworkStatus,
  items: Type.Array(SplitConfiguration),
});

export const ProvisionTestSplitBody = Type.Object({
  traderSharePercent: Type.Number({ exclusiveMinimum: 0, maximum: 50 }),
});

export type SettlementDto = Static<typeof Settlement>;
export type CreateSettlementInput = Static<typeof CreateSettlementBody>;
export type SettlementListDto = Static<typeof SettlementListResponse>;
export type SplitConfigurationDto = Static<typeof SplitConfiguration>;
export type SplitNetworkStatusDto = Static<typeof SplitNetworkStatus>;
export type SplitOverviewDto = Static<typeof SplitOverview>;
export type ProvisionTestSplitInput = Static<typeof ProvisionTestSplitBody>;
