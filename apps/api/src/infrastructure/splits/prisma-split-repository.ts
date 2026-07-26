import {
  SplitConfigurationRepository,
  SplitConfigurationState,
} from "../../domain/settlements/settlement-ports.js";
import { Database } from "../persistence/prisma-client.js";

export class PrismaSplitConfigurationRepository
  implements SplitConfigurationRepository
{
  constructor(private readonly db: Database) {}

  async findByAccount(accountId: string) {
    const row = await this.db.splitConfiguration.findUnique({
      where: { accountId },
    });
    return row ? this.toState(row) : null;
  }

  async listByTenant(tenantId: string) {
    const rows = await this.db.splitConfiguration.findMany({
      where: { account: { tenantId } },
      orderBy: { createdAt: "desc" },
    });
    return rows
      .map((row) => this.toState(row))
      .filter((row): row is SplitConfigurationState => row !== null);
  }

  async getVerifiedConfiguration(accountId: string) {
    const configuration = await this.findByAccount(accountId);
    if (!configuration?.immutable) return null;
    return {
      address: configuration.address,
      chainId: configuration.chainId,
      traderSharePercent: configuration.traderSharePercent,
      immutable: true as const,
      verifiedAt: configuration.verifiedAt,
    };
  }

  async save(configuration: SplitConfigurationState): Promise<void> {
    const data = {
      chainId: configuration.chainId,
      networkName: configuration.networkName,
      environment: configuration.environment,
      address: configuration.address,
      immutable: configuration.immutable,
      investorAddress: configuration.investorAddress,
      traderAddress: configuration.traderAddress,
      traderSharePct: configuration.traderSharePercent,
      splitType: configuration.splitType,
      protocolVersion: configuration.protocolVersion,
      deploymentTxHash: configuration.deploymentTxHash ?? null,
      verifiedAt: configuration.verifiedAt,
    };
    await this.db.splitConfiguration.upsert({
      where: { accountId: configuration.accountId },
      create: {
        id: configuration.id,
        accountId: configuration.accountId,
        createdAt: configuration.createdAt,
        ...data,
      },
      update: data,
    });
  }

  private toState(row: {
    id: string;
    accountId: string;
    chainId: number;
    networkName: string;
    environment: string;
    address: string;
    immutable: boolean;
    investorAddress: string;
    traderAddress: string;
    traderSharePct: { toString(): string };
    splitType: string;
    protocolVersion: string;
    deploymentTxHash: string | null;
    verifiedAt: Date | null;
    createdAt: Date;
  }): SplitConfigurationState | null {
    if (!row.immutable || !row.verifiedAt) return null;
    if (!["testnet", "mainnet"].includes(row.environment)) return null;
    if (!["push", "pull"].includes(row.splitType)) return null;
    return {
      id: row.id,
      accountId: row.accountId,
      chainId: row.chainId,
      networkName: row.networkName,
      environment: row.environment as "testnet" | "mainnet",
      address: row.address,
      immutable: true,
      investorAddress: row.investorAddress,
      traderAddress: row.traderAddress,
      traderSharePercent: Number(row.traderSharePct.toString()),
      splitType: row.splitType as "push" | "pull",
      protocolVersion: row.protocolVersion,
      ...(row.deploymentTxHash
        ? { deploymentTxHash: row.deploymentTxHash }
        : {}),
      verifiedAt: row.verifiedAt,
      createdAt: row.createdAt,
    };
  }
}
