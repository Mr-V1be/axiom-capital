import { ConnectAccount } from "../application/accounts/connect-account.js";
import { ListAccounts } from "../application/accounts/list-accounts.js";
import { GetPortfolioOverview } from "../application/portfolio/get-overview.js";
import { CreateSettlement } from "../application/settlements/create-settlement.js";
import { ListSettlements } from "../application/settlements/list-settlements.js";
import { PlaceBatchOrder } from "../application/trading/place-batch-order.js";
import { AccountRiskPolicy, CompositeRiskPolicy } from "../domain/risk/risk-profile.js";
import { SystemClock } from "../domain/shared/id.js";
import { ProportionalAllocationStrategy } from "../domain/trading/trading-ports.js";
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
  const audit = new PrismaAuditWriter(db, ids);
  const exchanges = new DefaultExchangeGatewayFactory(new MexcGateway());

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
      getPortfolioOverview: new GetPortfolioOverview(accounts, balances, clock),
      placeBatchOrder: new PlaceBatchOrder(
        accounts,
        balances,
        orders,
        exchanges,
        new ProportionalAllocationStrategy(),
        new CompositeRiskPolicy([new AccountRiskPolicy(riskProfiles)]),
        new BoundedExecutionScheduler(5),
        cipher,
        audit,
        ids,
        clock,
      ),
      createSettlement: new CreateSettlement(
        accounts,
        balances,
        settlements,
        settlements,
        audit,
        ids,
        clock,
      ),
      listSettlements: new ListSettlements(settlements),
    },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;
