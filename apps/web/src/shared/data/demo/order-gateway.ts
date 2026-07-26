import type {
  BatchOrderDto,
  CancelBatchOrderInput,
  InvestorAccountDto,
  PlaceBatchOrderInput,
} from "@axiom/contracts";

const money = (amount: string, currency = "USDT") => ({ amount, currency });

export class DemoOrderGateway {
  private readonly batches = new Map<string, BatchOrderDto>();

  constructor(private readonly accounts: () => InvestorAccountDto[]) {}

  async place(input: PlaceBatchOrderInput) {
    const accounts = this.accounts();
    const selected = accounts.filter((item) => input.accountIds.includes(item.id));
    const equity = selected.reduce(
      (sum, account) => sum + Number(account.equity.amount),
      0,
    );
    const total = input.allocationMode === "fixed_quote"
      ? Number(input.totalQuoteAmount)
      : equity * input.allocationPercent / 100;
    const batch: BatchOrderDto = {
      batchId: `batch_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`,
      symbol: input.symbol,
      side: input.side,
      type: input.type,
      allocationMode: input.allocationMode,
      allocationPercent: equity > 0 ? total / equity * 100 : 0,
      ...(input.allocationMode === "fixed_quote"
        ? { requestedQuoteAmount: money(input.totalQuoteAmount) }
        : {}),
      submittedAt: new Date().toISOString(),
      results: input.accountIds.map((accountId) => {
        const account = accounts.find((item) => item.id === accountId);
        const allocated = equity === 0
          ? 0
          : total * Number(account?.equity.amount ?? 0) / equity;
        return {
          accountId,
          orderId: `mx_${crypto.randomUUID().slice(0, 12)}`,
          status: "accepted" as const,
          allocated: money(allocated.toFixed(2)),
          filled: money("0"),
          remaining: money(allocated.toFixed(2)),
        };
      }),
    };
    this.batches.set(batch.batchId, batch);
    return batch;
  }

  async sync(batchId: string) {
    const batch = this.get(batchId);
    const updated: BatchOrderDto = {
      ...batch,
      results: batch.results.map((result) => result.status === "accepted"
        ? {
            ...result,
            status: "partially_filled",
            filled: money((Number(result.allocated.amount) / 2).toFixed(2)),
            remaining: money((Number(result.allocated.amount) / 2).toFixed(2)),
          }
        : result),
    };
    this.batches.set(batchId, updated);
    return updated;
  }

  async cancel(batchId: string, input: CancelBatchOrderInput) {
    const batch = this.get(batchId);
    const selected = input.accountIds ? new Set(input.accountIds) : null;
    const updated: BatchOrderDto = {
      ...batch,
      results: batch.results.map((result) =>
        (!selected || selected.has(result.accountId)) &&
        ["accepted", "partially_filled"].includes(result.status)
          ? { ...result, status: "cancelled" as const }
          : result),
    };
    this.batches.set(batchId, updated);
    return updated;
  }

  private get(batchId: string): BatchOrderDto {
    const batch = this.batches.get(batchId);
    if (!batch) throw new Error("Order batch not found");
    return batch;
  }
}
