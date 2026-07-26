import { PositionActionResult } from "../exchange/exchange-gateway.js";

export type PositionCommandStatus = "pending" | "completed" | "failed";

export interface PositionCommand {
  id: string;
  tenantId: string;
  accountId: string;
  positionId: string | null;
  idempotencyKey: string;
  action: string;
  request: Record<string, unknown>;
  status: PositionCommandStatus;
  result: PositionActionResult | null;
  error: string | null;
}

export interface PositionCommandRepository {
  reserve(command: PositionCommand): Promise<{
    claimed: boolean;
    command: PositionCommand;
  }>;
  complete(id: string, result: PositionActionResult): Promise<void>;
  fail(id: string, message: string): Promise<void>;
}
