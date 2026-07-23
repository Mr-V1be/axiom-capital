-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING', 'CONNECTED', 'DEGRADED', 'DISABLED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'FAILED', 'FILLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('CALCULATED', 'AWAITING_INVESTOR', 'FUNDED', 'DISTRIBUTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestorAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "investorName" TEXT NOT NULL,
    "exchange" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL,
    "encryptedKey" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "InvestorAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "equity" DECIMAL(36,18) NOT NULL,
    "pnlToday" DECIMAL(36,18) NOT NULL,
    "pnlTotal" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL,
    "balances" JSONB NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitConfiguration" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "chainId" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "immutable" BOOLEAN NOT NULL,
    "traderSharePct" DECIMAL(5,2) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SplitConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskProfile" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "maxAllocationPct" DECIMAL(5,2) NOT NULL,
    "maxDailyLossPct" DECIMAL(5,2) NOT NULL,
    "maxOpenPositions" INTEGER NOT NULL,
    "allowedSymbols" TEXT[],
    "tradingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "allocationPct" DECIMAL(5,2) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "exchangeOrderId" TEXT,
    "status" "OrderStatus" NOT NULL,
    "allocatedAmount" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "grossProfit" DECIMAL(36,18) NOT NULL,
    "investorShare" DECIMAL(36,18) NOT NULL,
    "traderShare" DECIMAL(36,18) NOT NULL,
    "traderSharePct" DECIMAL(5,2) NOT NULL,
    "highWaterMark" DECIMAL(36,18) NOT NULL,
    "currency" TEXT NOT NULL,
    "splitAddress" TEXT,
    "status" "SettlementStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "requestId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "InvestorAccount_tenantId_status_idx" ON "InvestorAccount"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InvestorAccount_tenantId_label_key" ON "InvestorAccount"("tenantId", "label");

-- CreateIndex
CREATE INDEX "BalanceSnapshot_accountId_capturedAt_idx" ON "BalanceSnapshot"("accountId", "capturedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SplitConfiguration_accountId_key" ON "SplitConfiguration"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskProfile_accountId_key" ON "RiskProfile"("accountId");

-- CreateIndex
CREATE INDEX "OrderBatch_tenantId_submittedAt_idx" ON "OrderBatch"("tenantId", "submittedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "OrderBatch_tenantId_idempotencyKey_key" ON "OrderBatch"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_accountId_createdAt_idx" ON "Order"("accountId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Order_batchId_accountId_key" ON "Order"("batchId", "accountId");

-- CreateIndex
CREATE INDEX "Settlement_tenantId_createdAt_idx" ON "Settlement"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_accountId_periodStart_periodEnd_key" ON "Settlement"("accountId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditEvent_aggregateType_aggregateId_idx" ON "AuditEvent"("aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestorAccount" ADD CONSTRAINT "InvestorAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestorAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitConfiguration" ADD CONSTRAINT "SplitConfiguration_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestorAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskProfile" ADD CONSTRAINT "RiskProfile_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestorAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderBatch" ADD CONSTRAINT "OrderBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "OrderBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestorAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "InvestorAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
