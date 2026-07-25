import {
  AuditWriter,
} from "../../application/shared/context.js";
import { IdGenerator } from "../../domain/shared/id.js";
import { Prisma } from "../../generated/prisma/client.js";
import { Database } from "./prisma-client.js";

export class PrismaAuditWriter implements AuditWriter {
  constructor(
    private readonly db: Database,
    private readonly ids: IdGenerator,
  ) {}

  async write(event: Parameters<AuditWriter["write"]>[0]): Promise<void> {
    await this.db.auditEvent.create({
      data: {
        id: this.ids.next(),
        tenantId: event.context.tenantId,
        actorId: event.context.actorId,
        action: event.action,
        aggregateType: event.aggregateType,
        aggregateId: event.aggregateId,
        payload: event.payload as Prisma.InputJsonValue,
        requestId: event.context.requestId,
        ipAddress: event.context.ipAddress ?? null,
      },
    });
  }
}
