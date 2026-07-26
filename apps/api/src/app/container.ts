import { ConnectAccount } from "../application/accounts/connect-account.js";
import { AccountConnectionAccess } from "../application/accounts/account-connection-access.js";
import { ListAccounts } from "../application/accounts/list-accounts.js";
import { GetAccountDetails } from "../application/accounts/get-account-details.js";
import { SyncAccountBalance } from "../application/accounts/sync-account-balance.js";
import { UpdateAccountAccess } from "../application/accounts/update-account-access.js";
import { GetPortfolioOverview } from "../application/portfolio/get-overview.js";
import { GetMarketQuote } from "../application/market/get-market-quote.js";
import { CreateSettlement } from "../application/settlements/create-settlement.js";
import { GetSplitOverview } from "../application/settlements/get-split-overview.js";
import { ListSettlements } from "../application/settlements/list-settlements.js";
import { ProvisionTestSplit } from "../application/settlements/provision-test-split.js";
import { CancelBatchOrders } from "../application/trading/cancel-batch-orders.js";
import { OrderExecutionAccess } from "../application/trading/order-execution-access.js";
import { PlaceBatchOrder } from "../application/trading/place-batch-order.js";
import { SyncBatchOrders } from "../application/trading/sync-batch-orders.js";
import { AccountRiskPolicy, CompositeRiskPolicy } from "../domain/risk/risk-profile.js";
import { SystemClock } from "../domain/shared/id.js";
import { ProportionalAllocationStrategy } from "../domain/trading/allocation-plan.js";
import { AppConfig } from "../infrastructure/config/app-config.js";
import {
  DefaultExchangeGatewayFactory,
  MexcGateway,
} from "../infrastructure/exchange/mexc-gateway.js";
import { BoundedExecutionScheduler } from "../infrastructure/execution/bounded-scheduler.js";
import { NanoIdGenerator } from "../infrastructure/ids/nanoid-generator.js";
import { PrismaAccountRepository } from "../infrastructure/persistence/account-repository.js";
import { PrismaAuditWriter } from "../infrastructure/persistence/audit-writer.js";
import { PrismaBalanceRepository } from "../infrastructure/persistence/balance-repository.js";
import { PrismaOrderRepository } from "../infrastructure/persistence/order-repository.js";
import { createPrismaClient } from "../infrastructure/persistence/prisma-client.js";
import { PrismaRiskProfileRepository } from "../infrastructure/persistence/risk-repository.js";
import { PrismaSettlementRepository } from "../infrastructure/persistence/settlement-repository.js";
import { AesGcmSecretCipher } from "../infrastructure/security/aes-secret-cipher.js";
import { DisabledSplitGateway } from "../infrastructure/splits/disabled-split-gateway.js";
import { PrismaSplitConfigurationRepository } from "../infrastructure/splits/prisma-split-repository.js";
import { SplitsV2TestForkGateway } from "../infrastructure/splits/splits-v2-gateway.js";

export function createContainer(config: AppConfig) {
  const db = createPrismaClient(config.databaseUrl);
  const ids = new NanoIdGenerator();
  const clock = new SystemClock();
  const cipher = new AesGcmSecretCipher(config.encryptionKey);
  const accounts = new PrismaAccountRepository(db, ids);
  const balances = new PrismaBalanceRepository(db, ids);
  const riskProfiles = new PrismaRiskProfileRepository(db, ids);
  const orders = new PrismaOrderRepository(db);
  const settlements = new PrismaSettlementRepository(db);
  const splitConfigurations = new PrismaSplitConfigurationRepository(db);
  const splits = config.splits.mode === "test_fork"
    ? new SplitsV2TestForkGateway(config.splits)
    : new DisabledSplitGateway();
  const audit = new PrismaAuditWriter(db, ids);
  const exchanges = new DefaultExchangeGatewayFactory(new MexcGateway());
  const scheduler = new BoundedExecutionScheduler(5);
  const connectionAccess = new AccountConnectionAccess(accounts, exchanges, cipher);
  const executionAccess = new OrderExecutionAccess(connectionAccess);

  return {
    db,
    useCases: {
      connectAccount: new ConnectAccount(
        accounts,
        accounts,
        exchanges,
        cipher,
        audit,
        ids,
        clock,
      ),
      listAccounts: new ListAccounts(accounts, balances),
      getAccountDetails: new GetAccountDetails(connectionAccess, balances),
      syncAccountBalance: new SyncAccountBalance(
        accounts,
        balances,
        connectionAccess,
        audit,
        ids,
        clock,
      ),
      updateAccountAccess: new UpdateAccountAccess(
        connectionAccess,
        accounts,
        audit,
      ),
      getPortfolioOverview: new GetPortfolioOverview(accounts, balances, clock),
      getMarketQuote: new GetMarketQuote(exchanges.for("mexc")),
      placeBatchOrder: new PlaceBatchOrder(
        accounts,
        balances,
        orders,
        executionAccess,
        new ProportionalAllocationStrategy(),
        new CompositeRiskPolicy([new AccountRiskPolicy(riskProfiles)]),
        scheduler,
        audit,
        ids,
        clock,
      ),
      syncBatchOrders: new SyncBatchOrders(
        orders,
        executionAccess,
        scheduler,
        audit,
        clock,
      ),
      cancelBatchOrders: new CancelBatchOrders(
        orders,
        executionAccess,
        scheduler,
        audit,
        clock,
      ),
      createSettlement: new CreateSettlement(
        accounts,
        balances,
        settlements,
        splitConfigurations,
        audit,
        ids,
        clock,
      ),
      listSettlements: new ListSettlements(settlements),
      getSplitOverview: new GetSplitOverview(splitConfigurations, splits),
      provisionTestSplit: new ProvisionTestSplit(
        accounts,
        splitConfigurations,
        splits,
        audit,
        ids,
        clock,
      ),
    },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
