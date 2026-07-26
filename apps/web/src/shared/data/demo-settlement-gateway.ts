import type {
  CreateSettlementInput,
  InvestorAccountDto,
  ProvisionTestSplitInput,
  SettlementDto,
  SplitConfigurationDto,
} from "@axiom/contracts";
import { demoNow, demoSettlements } from "./demo-seed";

const money = (amount: string) => ({ amount, currency: "USDT" });

export class DemoSettlementGateway {
  private settlements = [...demoSettlements];
  private splits: SplitConfigurationDto[] = [];

  list() {
    return { items: [...this.settlements] };
  }

  create(input: CreateSettlementInput, accounts: InvestorAccountDto[]) {
    const account = accounts.find((item) => item.id === input.accountId);
    if (!account) throw new Error("Account not found");
    const gross = Math.max(0, Number(account.pnlTotal.amount));
    const trader = gross * (input.traderSharePercent / 100);
    const settlement: SettlementDto = {
      id: `set_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      accountId: account.id,
      investorName: account.investorName,
      periodStart: account.createdAt,
      periodEnd: input.periodEnd,
      grossProfit: money(gross.toFixed(2)),
      investorShare: money((gross - trader).toFixed(2)),
      traderShare: money(trader.toFixed(2)),
      traderSharePercent: input.traderSharePercent,
      highWaterMark: account.equity,
      status: "calculated",
      createdAt: new Date().toISOString(),
    };
    this.settlements = [settlement, ...this.settlements];
    return settlement;
  }

  overview() {
    return {
      network: {
        mode: "test_fork" as const,
        connected: true,
        factoryDeployed: true,
        chainId: 84532,
        networkName: "Base Sepolia Fork",
        blockNumber: "28461001",
        signerAddress: "0x3333333333333333333333333333333333333333",
        signerBalanceWei: "100000000000000000000",
      },
      items: [...this.splits],
    };
  }

  provision(accountId: string, input: ProvisionTestSplitInput) {
    const existing = this.splits.find((item) => item.accountId === accountId);
    if (existing) return existing;
    const configuration: SplitConfigurationDto = {
      accountId,
      chainId: 84532,
      networkName: "Base Sepolia Fork",
      environment: "testnet",
      address: "0x1111111111111111111111111111111111111111",
      immutable: true,
      investorAddress: "0x2222222222222222222222222222222222222222",
      traderAddress: "0x3333333333333333333333333333333333333333",
      traderSharePercent: input.traderSharePercent,
      splitType: "push",
      protocolVersion: "splitV2o2",
      deploymentTxHash: `0x${"4".repeat(64)}`,
      verifiedAt: demoNow,
    };
    this.splits = [configuration, ...this.splits];
    return configuration;
  }
}
