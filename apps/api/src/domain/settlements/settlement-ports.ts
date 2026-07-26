import { Money } from "../shared/money.js";
import { Settlement } from "./settlement.js";

export interface SettlementAnchor {
  periodEnd: Date;
  highWaterMark: Money;
}

export interface SettlementRepository {
  latestAnchor(accountId: string): Promise<SettlementAnchor | null>;
  save(settlement: Settlement): Promise<void>;
  list(
    tenantId: string,
    page: { cursor?: string; limit: number },
  ): Promise<{ items: Settlement[]; nextCursor?: string }>;
}

export interface SplitAddressBook {
  getVerifiedConfiguration(
    accountId: string,
  ): Promise<VerifiedSplitConfiguration | null>;
}

export interface SplitConfigurationState {
  id: string;
  accountId: string;
  address: string;
  chainId: number;
  networkName: string;
  environment: "testnet" | "mainnet";
  investorAddress: string;
  traderAddress: string;
  traderSharePercent: number;
  splitType: "push" | "pull";
  protocolVersion: string;
  deploymentTxHash?: string;
  immutable: true;
  verifiedAt: Date;
  createdAt: Date;
}

export type VerifiedSplitConfiguration = Pick<
  SplitConfigurationState,
  "address" | "chainId" | "traderSharePercent" | "immutable" | "verifiedAt"
>;

export interface SplitConfigurationRepository extends SplitAddressBook {
  findByAccount(accountId: string): Promise<SplitConfigurationState | null>;
  listByTenant(tenantId: string): Promise<SplitConfigurationState[]>;
  save(configuration: SplitConfigurationState): Promise<void>;
}

export interface SplitNetworkStatus {
  mode: "disabled" | "test_fork";
  connected: boolean;
  factoryDeployed: boolean;
  chainId?: number;
  networkName?: string;
  blockNumber?: string;
  signerAddress?: string;
  signerBalanceWei?: string;
}

export interface ProvisionedSplit {
  chainId: number;
  networkName: string;
  environment: "testnet";
  address: string;
  investorAddress: string;
  traderAddress: string;
  traderSharePercent: number;
  splitType: "push";
  protocolVersion: string;
  deploymentTxHash?: string;
  verifiedAt: Date;
}

export interface SplitProvisioningGateway {
  status(): Promise<SplitNetworkStatus>;
  provision(input: {
    tenantId: string;
    accountId: string;
    traderSharePercent: number;
  }): Promise<ProvisionedSplit>;
}
