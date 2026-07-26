import { createHmac } from "node:crypto";
import splitsSdk from "@0xsplits/splits-sdk";
import type {
  CreateSplitV2Config,
  SplitV2Type,
} from "@0xsplits/splits-sdk/types";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  keccak256,
  toBytes,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  ProvisionedSplit,
  SplitProvisioningGateway,
} from "../../domain/settlements/settlement-ports.js";
import { ExternalServiceError } from "../../domain/shared/domain-error.js";

const FACTORY = "0x8E8eB0cC6AE34A38B67D5Cf91ACa38f60bc3Ecf4";
const VERSION = "splitV2o2";
const PUSH = "push" as SplitV2Type;

interface GatewayConfig {
  chainId: 84532;
  networkName: "Base Sepolia Fork";
  rpcUrl: string;
  deployerPrivateKey: `0x${string}`;
  recipientSeed: string;
}

export class SplitsV2TestForkGateway implements SplitProvisioningGateway {
  private readonly signer;
  private readonly publicClient;
  private readonly client;

  constructor(private readonly config: GatewayConfig) {
    this.signer = privateKeyToAccount(config.deployerPrivateKey);
    const transport = http(config.rpcUrl, { timeout: 15_000 });
    this.publicClient = createPublicClient({ chain: baseSepolia, transport });
    const walletClient = createWalletClient({
      account: this.signer,
      chain: baseSepolia,
      transport,
    });
    this.client = new splitsSdk.SplitsClient({
      chainId: config.chainId,
      publicClient: this.publicClient,
      walletClient,
    });
  }

  async status() {
    const base = {
      mode: "test_fork" as const,
      chainId: this.config.chainId,
      networkName: this.config.networkName,
      signerAddress: this.signer.address,
    };
    try {
      const [chainId, blockNumber, bytecode, balance] = await Promise.all([
        this.publicClient.getChainId(),
        this.publicClient.getBlockNumber(),
        this.publicClient.getBytecode({ address: FACTORY }),
        this.publicClient.getBalance({ address: this.signer.address }),
      ]);
      return {
        ...base,
        connected: chainId === this.config.chainId,
        factoryDeployed: Boolean(bytecode && bytecode !== "0x"),
        blockNumber: blockNumber.toString(),
        signerBalanceWei: balance.toString(),
      };
    } catch {
      return {
        ...base,
        connected: false,
        factoryDeployed: false,
      };
    }
  }

  async provision(input: {
    tenantId: string;
    accountId: string;
    traderSharePercent: number;
  }): Promise<ProvisionedSplit> {
    try {
      await this.fundSigner();
      const investorAddress = this.investorAddress(input.accountId);
      const args = this.createArgs(input, investorAddress);
      const prediction = await this.client.splitV2.isDeployed(args);
      let deploymentTxHash: string | undefined;
      if (!prediction.deployed) {
        const created = await this.client.splitV2.createSplit(args);
        deploymentTxHash = created.event.transactionHash ?? undefined;
      }
      const verifiedAt = await this.verify(
        prediction.splitAddress,
        investorAddress,
        input.traderSharePercent,
      );
      return {
        chainId: this.config.chainId,
        networkName: this.config.networkName,
        environment: "testnet",
        address: prediction.splitAddress,
        investorAddress,
        traderAddress: this.signer.address,
        traderSharePercent: input.traderSharePercent,
        splitType: "push",
        protocolVersion: VERSION,
        ...(deploymentTxHash ? { deploymentTxHash } : {}),
        verifiedAt,
      };
    } catch (error) {
      throw new ExternalServiceError(
        "splits",
        error instanceof Error ? error.message : "Split provisioning failed",
        { cause: error },
      );
    }
  }

  private createArgs(
    input: { tenantId: string; accountId: string; traderSharePercent: number },
    investorAddress: `0x${string}`,
  ): CreateSplitV2Config {
    return {
      recipients: [
        {
          address: investorAddress,
          percentAllocation: 100 - input.traderSharePercent,
        },
        {
          address: this.signer.address,
          percentAllocation: input.traderSharePercent,
        },
      ],
      distributorFeePercent: 0,
      splitType: PUSH,
      ownerAddress: zeroAddress,
      creatorAddress: this.signer.address,
      salt: keccak256(toBytes(`axiom:${input.tenantId}:${input.accountId}`)),
      chainId: this.config.chainId,
      version: VERSION,
    };
  }

  private async verify(
    splitAddress: `0x${string}`,
    investorAddress: `0x${string}`,
    traderSharePercent: number,
  ): Promise<Date> {
    const [owner, metadata, bytecode] = await Promise.all([
      this.client.splitV2.owner({
        splitAddress,
        chainId: this.config.chainId,
      }),
      this.client.splitV2.getSplitMetadataViaProvider({
        splitAddress,
        chainId: this.config.chainId,
      }),
      this.publicClient.getBytecode({ address: splitAddress }),
    ]);
    const recipients = metadata.split.recipients;
    const investor = recipients.find(
      (item) => getAddress(item.recipient.address) === getAddress(investorAddress),
    );
    const trader = recipients.find(
      (item) => getAddress(item.recipient.address) === this.signer.address,
    );
    const valid = owner.ownerAddress === zeroAddress &&
      Boolean(bytecode && bytecode !== "0x") &&
      metadata.split.distributeDirection === "push" &&
      investor?.percentAllocation === 100 - traderSharePercent &&
      trader?.percentAllocation === traderSharePercent;
    if (!valid) throw new Error("Deployed Split failed on-chain verification");
    return new Date();
  }

  private investorAddress(accountId: string): `0x${string}` {
    const digest = createHmac("sha256", this.config.recipientSeed)
      .update(`investor:${accountId}`)
      .digest("hex");
    return privateKeyToAccount(`0x${digest}`).address;
  }

  private async fundSigner(): Promise<void> {
    const response = await fetch(this.config.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "anvil_setBalance",
        params: [this.signer.address, "0x56BC75E2D63100000"],
      }),
    });
    const body = await response.json() as { result?: unknown; error?: unknown };
    if (!response.ok || body.error !== undefined) {
      throw new Error("Unable to fund the isolated test signer");
    }
  }
}
