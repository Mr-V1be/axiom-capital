import { InvestorAccountState } from "../../domain/accounts/investor-account.js";
import { BalanceSnapshot } from "../../domain/accounts/account-ports.js";
import { SettlementState } from "../../domain/settlements/settlement.js";
import { OrderBatchState } from "../../domain/trading/order.js";

const money = (value: { toString(): string; currency: string }) => ({
  amount: value.toString(),
  currency: value.currency,
});

export function accountDto(
  account: Readonly<InvestorAccountState>,
  balance: BalanceSnapshot | null,
) {
  const currency = balance?.equity.currency ?? "USDT";
  return {
    id: account.id,
    label: account.label,
    investorName: account.investorName,
    exchange: account.exchange,
    status: account.status,
    equity: balance ? money(balance.equity) : { amount: "0", currency },
    pnlToday: balance ? money(balance.pnlToday) : { amount: "0", currency },
    pnlTotal: balance ? money(balance.pnlTotal) : { amount: "0", currency },
    permissions: { read: true, trade: true, withdraw: false as const },
    ...(account.lastSyncedAt
      ? { lastSyncedAt: account.lastSyncedAt.toISOString() }
      : {}),
    createdAt: account.createdAt.toISOString(),
  };
}

export function orderBatchDto(batch: Readonly<OrderBatchState>) {
  return {
    batchId: batch.id,
    submittedAt: batch.submittedAt.toISOString(),
    results: batch.orders.map((order) => {
      const state = order.snapshot();
      return {
        accountId: state.accountId,
        ...(state.exchangeOrderId ? { orderId: state.exchangeOrderId } : {}),
        status:
          state.status === "accepted" || state.status === "filled"
            ? "accepted" as const
            : state.status === "rejected"
              ? "rejected" as const
              : "failed" as const,
        allocated: money(state.allocated),
        ...(state.failureReason ? { reason: state.failureReason } : {}),
      };
    }),
  };
}

export function settlementDto(state: Readonly<SettlementState>) {
  return {
    id: state.id,
    accountId: state.accountId,
    investorName: state.investorName,
    periodStart: state.periodStart.toISOString(),
    periodEnd: state.periodEnd.toISOString(),
    grossProfit: money(state.grossProfit),
    investorShare: money(state.investorShare),
    traderShare: money(state.traderShare),
    traderSharePercent: state.traderSharePercent,
    highWaterMark: money(state.highWaterMark),
    ...(state.splitAddress ? { splitAddress: state.splitAddress } : {}),
    status: state.status,
    createdAt: state.createdAt.toISOString(),
  };
}
