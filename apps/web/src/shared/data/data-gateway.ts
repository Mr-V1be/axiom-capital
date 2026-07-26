import type {
  AccountListDto,
  AccountDetailsDto,
  BatchOrderDto,
  CancelBatchOrderInput,
  CancelExchangeOrderInput,
  ConnectAccountInput,
  CreateSettlementInput,
  ExchangeActivityDto,
  ExchangeCommandDto,
  InvestorAccountDto,
  MarketQuoteDto,
  PlaceBatchOrderInput,
  PositionListDto,
  PositionActionDto,
  PositionActionInput,
  PortfolioOverviewDto,
  ProvisionTestSplitInput,
  SettlementDto,
  SplitConfigurationDto,
  SplitOverviewDto,
} from "@axiom/contracts";

export interface DataGateway {
  getPortfolioOverview(signal?: AbortSignal): Promise<PortfolioOverviewDto>;
  listPositions(signal?: AbortSignal): Promise<PositionListDto>;
  listExchangeActivity(signal?: AbortSignal): Promise<ExchangeActivityDto>;
  managePosition(
    accountId: string,
    positionId: string,
    input: PositionActionInput,
  ): Promise<PositionActionDto>;
  cancelExchangeOrder(
    orderId: string,
    input: CancelExchangeOrderInput,
  ): Promise<ExchangeCommandDto>;
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
  getSplitOverview(signal?: AbortSignal): Promise<SplitOverviewDto>;
  provisionTestSplit(
    accountId: string,
    input: ProvisionTestSplitInput,
  ): Promise<SplitConfigurationDto>;
}
