import type {
  AccountListDto,
  AccountDetailsDto,
  BatchOrderDto,
  CancelBatchOrderInput,
  ConnectAccountInput,
  CreateSettlementInput,
  InvestorAccountDto,
  MarketQuoteDto,
  PlaceBatchOrderInput,
  PortfolioOverviewDto,
  SettlementDto,
} from "@axiom/contracts";

export interface DataGateway {
  getPortfolioOverview(signal?: AbortSignal): Promise<PortfolioOverviewDto>;
  listAccounts(signal?: AbortSignal): Promise<AccountListDto>;
  getAccountDetails(
    accountId: string,
    signal?: AbortSignal,
  ): Promise<AccountDetailsDto>;
  connectAccount(input: ConnectAccountInput): Promise<InvestorAccountDto>;
  syncAccount(accountId: string): Promise<InvestorAccountDto>;
  updateAccountAccess(
    accountId: string,
    accessMode: "read_only" | "trade",
  ): Promise<InvestorAccountDto>;
  getMarketQuote(
    symbol: string,
    marketType: "spot" | "swap",
    signal?: AbortSignal,
  ): Promise<MarketQuoteDto>;
  placeBatchOrder(input: PlaceBatchOrderInput): Promise<BatchOrderDto>;
  syncBatchOrder(batchId: string): Promise<BatchOrderDto>;
  cancelBatchOrder(
    batchId: string,
    input: CancelBatchOrderInput,
  ): Promise<BatchOrderDto>;
  listSettlements(signal?: AbortSignal): Promise<{ items: SettlementDto[] }>;
  createSettlement(input: CreateSettlementInput): Promise<SettlementDto>;
}
