-- Extend order lifecycle without recreating the enum or losing existing values.
ALTER TYPE "OrderStatus" ADD VALUE 'PARTIALLY_FILLED' AFTER 'ACCEPTED';

-- Persist the exchange account topology used by execution gateways.
ALTER TABLE "InvestorAccount"
ADD COLUMN "accountScope" TEXT NOT NULL DEFAULT 'standalone',
ADD COLUMN "marketType" TEXT NOT NULL DEFAULT 'spot',
ADD COLUMN "externalAccountId" TEXT;

-- Preserve both allocation strategies and their original request.
ALTER TABLE "OrderBatch"
ADD COLUMN "allocationMode" TEXT NOT NULL DEFAULT 'equity_percentage',
ADD COLUMN "requestedQuoteAmount" DECIMAL(36,18);

ALTER TABLE "OrderBatch"
ALTER COLUMN "allocationPct" TYPE DECIMAL(9,6);

-- Store enough exchange state to reconcile partial fills and cancellations.
ALTER TABLE "Order"
ADD COLUMN "filledAmount" DECIMAL(36,18) NOT NULL DEFAULT 0,
ADD COLUMN "remainingAmount" DECIMAL(36,18) NOT NULL DEFAULT 0,
ADD COLUMN "averagePrice" DECIMAL(36,18),
ADD COLUMN "lastSyncedAt" TIMESTAMP(3);

UPDATE "Order"
SET "remainingAmount" = "allocatedAmount"
WHERE "status" IN ('PENDING', 'ACCEPTED');
