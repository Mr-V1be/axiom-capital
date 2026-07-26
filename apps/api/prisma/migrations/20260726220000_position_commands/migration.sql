CREATE TABLE "PositionCommand" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "positionId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "result" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PositionCommand_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PositionCommand_tenantId_idempotencyKey_key"
ON "PositionCommand"("tenantId", "idempotencyKey");

CREATE INDEX "PositionCommand_accountId_createdAt_idx"
ON "PositionCommand"("accountId", "createdAt" DESC);

ALTER TABLE "PositionCommand"
ADD CONSTRAINT "PositionCommand_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PositionCommand"
ADD CONSTRAINT "PositionCommand_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "InvestorAccount"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
