import type {
  ConnectAccountInput,
  InvestorAccountDto,
  PlaceBatchOrderInput,
  SettlementDto,
} from "@axiom/contracts";
import { DataGateway } from "./data-gateway";

const money = (amount: string, currency = "USDT") => ({ amount, currency });
const now = "2026-07-23T16:00:00.000Z";

const initialAccounts: InvestorAccountDto[] = [
  {
    id: "acc_vladislav_00000001",
    label: "Vladislav · Main",
    investorName: "Vladislav",
    exchange: "mexc",
    status: "connected",
    equity: money("42840.20"),
    pnlToday: money("684.90"),
    pnlTotal: money("6280.20"),
    permissions: { read: true, trade: true, withdraw: false },
    lastSyncedAt: now,
    createdAt: "2026-04-12T10:00:00.000Z",
  },
  {
    id: "acc_roman_000000000001",
    label: "Roman · Growth",
    investorName: "Roman",
    exchange: "mexc",
    status: "connected",
    equity: money("31602.45"),
    pnlToday: money("312.18"),
    pnlTotal: money("3902.45"),
    permissions: { read: true, trade: true, withdraw: false },
    lastSyncedAt: "2026-07-23T15:59:42.000Z",
    createdAt: "2026-05-03T09:00:00.000Z",
  },
  {
    id: "acc_alex_0000000000001",
    label: "Alex · Conservative",
    investorName: "Alex",
    exchange: "mexc",
    status: "connected",
    equity: money("27150.00"),
    pnlToday: money("182.64"),
    pnlTotal: money("2150.00"),
    permissions: { read: true, trade: true, withdraw: false },
    lastSyncedAt: "2026-07-23T15:59:21.000Z",
    createdAt: "2026-05-19T11:00:00.000Z",
  },
  {
    id: "acc_maria_000000000001",
    label: "Maria · Alpha",
    investorName: "Maria",
    exchange: "mexc",
    status: "degraded",
    equity: money("22548.75"),
    pnlToday: money("-86.40"),
    pnlTotal: money("1548.75"),
    permissions: { read: true, trade: true, withdraw: false },
    lastSyncedAt: "2026-07-23T15:41:08.000Z",
    createdAt: "2026-06-02T13:00:00.000Z",
  },
];

const initialSettlements: SettlementDto[] = [
  {
    id: "set_vladislav_00000001",
    accountId: initialAccounts[0]!.id,
    investorName: "Vladislav",
    periodStart: "2026-07-01T00:00:00.000Z",
    periodEnd: "2026-07-23T00:00:00.000Z",
    grossProfit: money("3280.20"),
    investorShare: money("2624.16"),
    traderShare: money("656.04"),
    traderSharePercent: 20,
    highWaterMark: money("42840.20"),
    splitAddress: "0x86A2fFc3b1d9c4a530Fb78f9b733E8B7B1c6D020",
    status: "awaiting_investor",
    createdAt: now,
  },
  {
    id: "set_roman_000000000001",
    accountId: initialAccounts[1]!.id,
    investorName: "Roman",
    periodStart: "2026-07-01T00:00:00.000Z",
    periodEnd: "2026-07-20T00:00:00.000Z",
    grossProfit: money("1902.45"),
    investorShare: money("1521.96"),
    traderShare: money("380.49"),
    traderSharePercent: 20,
    highWaterMark: money("31602.45"),
    splitAddress: "0x54B2F15d54a1A8108B7cB4d0120C2D88fD0e7B11",
    status: "distributed",
    createdAt: "2026-07-20T09:00:00.000Z",
  },
];

export class DemoDataGateway implements DataGateway {
  private accounts = [...initialAccounts];
  private settlements = [...initialSettlements];

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
      updatedAt: now,
    };
  }

  async listAccounts() {
    return { items: [...this.accounts] };
  }

  async connectAccount(input: ConnectAccountInput) {
    const account: InvestorAccountDto = {
      id: `acc_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      label: input.label,
      investorName: input.investorName,
      exchange: input.exchange,
      status: "connected",
      equity: money("0"),
      pnlToday: money("0"),
      pnlTotal: money("0"),
      permissions: { read: true, trade: true, withdraw: false },
      lastSyncedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.accounts = [account, ...this.accounts];
    return account;
  }

  async placeBatchOrder(input: PlaceBatchOrderInput) {
    return {
      batchId: `batch_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      submittedAt: new Date().toISOString(),
      results: input.accountIds.map((accountId) => {
        const account = this.accounts.find((item) => item.id === accountId);
        const allocated = Number(account?.equity.amount ?? 0) *
          (input.allocationPercent / 100);
        return {
          accountId,
          orderId: `mx_${crypto.randomUUID().slice(0, 12)}`,
          status: "accepted" as const,
          allocated: money(allocated.toFixed(2)),
        };
      }),
    };
  }

  async listSettlements() {
    return { items: [...this.settlements] };
  }

  async createSettlement(input: {
    accountId: string;
    periodEnd: string;
    traderSharePercent: number;
  }) {
    const account = this.accounts.find((item) => item.id === input.accountId);
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
}
