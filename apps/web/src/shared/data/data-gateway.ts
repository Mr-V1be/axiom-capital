import type {
  AccountListDto,
  BatchOrderDto,
  CancelBatchOrderInput,
  ConnectAccountInput,
  CreateSettlementInput,
  InvestorAccountDto,
  PlaceBatchOrderInput,
  PortfolioOverviewDto,
  SettlementDto,
} from "@axiom/contracts";

export interface DataGateway {
  getPortfolioOverview(signal?: AbortSignal): Promise<PortfolioOverviewDto>;
  listAccounts(signal?: AbortSignal): Promise<AccountListDto>;
  connectAccount(input: ConnectAccountInput): Promise<InvestorAccountDto>;
  syncAccount(accountId: string): Promise<InvestorAccountDto>;
  placeBatchOrder(input: PlaceBatchOrderInput): Promise<BatchOrderDto>;
  syncBatchOrder(batchId: string): Promise<BatchOrderDto>;
  cancelBatchOrder(
    batchId: string,
    input: CancelBatchOrderInput,
  ): Promise<BatchOrderDto>;
  listSettlements(signal?: AbortSignal): Promise<{ items: SettlementDto[] }>;
  createSettlement(input: CreateSettlementInput): Promise<SettlementDto>;
}
