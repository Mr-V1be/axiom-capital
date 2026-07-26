import { Prisma } from "../../../generated/prisma/client.js";
import {
  PositionCommand,
  PositionCommandRepository,
} from "../../../domain/positions/position-command.js";
import { Database } from "../prisma-client.js";

export class PrismaPositionCommandRepository
implements PositionCommandRepository {
  constructor(private readonly db: Database) {}

  async reserve(command: PositionCommand) {
    try {
      const created = await this.db.positionCommand.create({
        data: {
          id: command.id,
          tenantId: command.tenantId,
          accountId: command.accountId,
          positionId: command.positionId,
          idempotencyKey: command.idempotencyKey,
          action: command.action,
          request: command.request as Prisma.InputJsonValue,
          status: command.status,
        },
      });
      return { claimed: true, command: map(created) };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002") throw error;
      const existing = await this.db.positionCommand.findUniqueOrThrow({
        where: {
          tenantId_idempotencyKey: {
            tenantId: command.tenantId,
            idempotencyKey: command.idempotencyKey,
          },
        },
      });
      return { claimed: false, command: map(existing) };
    }
  }

  async complete(
    id: string,
    result: { references: string[]; message: string },
  ): Promise<void> {
    await this.db.positionCommand.update({
      where: { id },
      data: {
        status: "completed",
        result: result as unknown as Prisma.InputJsonValue,
        error: null,
      },
    });
  }

  async fail(id: string, message: string): Promise<void> {
    await this.db.positionCommand.update({
      where: { id },
      data: { status: "failed", error: message },
    });
  }
}

interface StoredCommand {
  id: string;
  tenantId: string;
  accountId: string;
  positionId: string | null;
  idempotencyKey: string;
  action: string;
  request: unknown;
  status: string;
  result: unknown;
  error: string | null;
}

function map(value: StoredCommand): PositionCommand {
  return {
    id: value.id,
    tenantId: value.tenantId,
    accountId: value.accountId,
    positionId: value.positionId,
    idempotencyKey: value.idempotencyKey,
    action: value.action,
    request: value.request as Record<string, unknown>,
    status: value.status as PositionCommand["status"],
    result: value.result as PositionCommand["result"],
    error: value.error,
  };
}
