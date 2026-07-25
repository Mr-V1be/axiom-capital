ALTER TABLE "InvestorAccount"
ADD COLUMN "accessMode" TEXT NOT NULL DEFAULT 'read_only';

ALTER TABLE "RiskProfile"
ALTER COLUMN "tradingEnabled" SET DEFAULT false;
