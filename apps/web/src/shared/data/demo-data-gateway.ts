import type {
  CancelBatchOrderInput,
  CancelExchangeOrderInput,
  ConnectAccountInput,
  CreateSettlementInput,
  InvestorAccountDto,
  PlaceBatchOrderInput,
  PositionActionInput,
  ProvisionTestSplitInput,
} from "@axiom/contracts";
import { DataGateway } from "./data-gateway";
import { demoAccounts, demoNow, demoPositions } from "./demo-seed";
import { demoAccountDetails } from "./demo-account-details";
import { DemoSettlementGateway } from "./demo-settlement-gateway";
import { DemoPositionActivityGateway } from "./demo/position-activity-gateway";
import { DemoOrderGateway } from "./demo/order-gateway";

const money = (amount: string, currency = "USDT") => ({ amount, currency });

export class DemoDataGateway implements DataGateway {
  private accounts = [...demoAccounts];
  private readonly settlementGateway = new DemoSettlementGateway();
  private readonly positionGateway = new DemoPositionActivityGateway();
  private readonly orderGateway = new DemoOrderGateway(() => this.accounts);

  async getPortfolioOverview() {
    const equity = this.accounts.reduce(
      (sum, account) => sum + Number(account.equity.amount),
      0,
    );
    const pnlToday = this.accounts.reduce(
      (sum, account) => sum + Number(account.pnlToday.amount),
      0,
    );
    const base = equity - 9750;
    return {
      totalEquity: money(equity.toFixed(2)),
      pnlToday: money(pnlToday.toFixed(2)),
      pnlMonth: money("9750.00"),
      activeAccounts: this.accounts.length,
      connectedAccounts: this.accounts.filter((item) => item.status === "connected").length,
      maxDrawdownPercent: 3.42,
      equityCurve: Array.from({ length: 18 }, (_, index) => ({
        at: new Date(Date.UTC(2026, 6, 6 + index)).toISOString(),
        value: (
          base +
          index * 515 +
          Math.sin(index * 0.92) * 780 +
          (index > 12 ? 680 : 0)
        ).toFixed(2),
      })),
      updatedAt: demoNow,
    };
  }

  async listPositions() {
    return {
      items: demoPositions.map((item) => ({
        ...item,
        updatedAt: new Date().toISOString(),
      })),
      failures: [],
      updatedAt: new Date().toISOString(),
    };
  }

  async listExchangeActivity() {
    return this.positionGateway.list();
  }

  async managePosition(
    _accountId: string,
    _positionId: string,
    input: PositionActionInput,
  ) {
    return this.positionGateway.manage(input);
  }

  async cancelExchangeOrder(
    _orderId: string,
    input: CancelExchangeOrderInput,
  ) {
    return this.positionGateway.cancel(input);
  }

  async listAccounts() {
    return { items: [...this.accounts] };
  }

  async getAccountDetails(accountId: string) {
    const account = this.accounts.find((item) => item.id === accountId);
    if (!account) throw new Error("Account not found");
    return demoAccountDetails(account);
  }

  async connectAccount(input: ConnectAccountInput) {
    const account: InvestorAccountDto = {
      id: `acc_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      label: input.label,
      investorName: input.investorName,
      exchange: input.exchange,
      accountScope: input.accountScope,
      marketType: input.marketType,
      accessMode: input.accessMode,
      ...(input.externalAccountId
        ? { externalAccountId: input.externalAccountId }
        : {}),
      status: "connected",
      equity: money("0"),
      pnlToday: money("0"),
      pnlTotal: money("0"),
      permissions: {
        read: true,
        trade: input.accessMode === "trade",
        withdraw: false,
      },
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.accounts = [account, ...this.accounts];
    return account;
  }

  async syncAccount(accountId: string) {
    const account = this.accounts.find((item) => item.id === accountId);
    if (!account) throw new Error("Account not found");
    const synchronized = {
      ...account,
      lastSyncedAt: new Date().toISOString(),
    };
    this.accounts = this.accounts.map((item) =>
      item.id === accountId ? synchronized : item
    );
    return synchronized;
  }

  async updateAccountAccess(
    accountId: string,
    accessMode: "read_only" | "trade",
  ) {
    const account = this.accounts.find((item) => item.id === accountId);
    if (!account) throw new Error("Account not found");
    const updated = {
      ...account,
      accessMode,
      permissions: {
        ...account.permissions,
        trade: accessMode === "trade",
      },
    };
    this.accounts = this.accounts.map((item) =>
      item.id === accountId ? updated : item
    );
    return updated;
  }

  async getMarketQuote(symbol: string, marketType: "spot" | "swap") {
    return {
      symbol,
      marketType,
      price: symbol === "BTC/USDT" ? "118420.1" : "3640.25",
      minimumOrderAmount: marketType === "swap" ? "1" : "0.000001",
      contractSize: marketType === "swap"
        ? symbol === "BTC/USDT" ? "0.0001" : "0.01"
        : null,
      changePercent24h: 2.84,
      quoteVolume24h: "2410000000",
      updatedAt: new Date().toISOString(),
    };
  }

  async placeBatchOrder(input: PlaceBatchOrderInput) {
    return this.orderGateway.place(input);
  }

  async syncBatchOrder(batchId: string) {
    return this.orderGateway.sync(batchId);
  }

  async cancelBatchOrder(batchId: string, input: CancelBatchOrderInput) {
    return this.orderGateway.cancel(batchId, input);
  }

  async listSettlements() {
    return this.settlementGateway.list();
  }

  async createSettlement(input: CreateSettlementInput) {
    return this.settlementGateway.create(input, this.accounts);
  }

  async getSplitOverview() {
    return this.settlementGateway.overview();
  }

  async provisionTestSplit(
    accountId: string,
    input: ProvisionTestSplitInput,
  ) {
    return this.settlementGateway.provision(accountId, input);
  }

}
