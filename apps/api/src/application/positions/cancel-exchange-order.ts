import { CancelExchangeOrderInput } from "@axiom/contracts";
import { PositionCommandRepository } from "../../domain/positions/position-command.js";
import { ConflictError } from "../../domain/shared/domain-error.js";
import { IdGenerator } from "../../domain/shared/id.js";
import { AuditWriter, RequestContext } from "../shared/context.js";
import { OrderExecutionAccess } from "../trading/order-execution-access.js";

export class CancelExchangeOrder {
  constructor(
    private readonly access: OrderExecutionAccess,
    private readonly commands: PositionCommandRepository,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    context: RequestContext,
    orderId: string,
    input: CancelExchangeOrderInput,
  ) {
    const connection = await this.access.forAccount(
      context.tenantId,
      input.accountId,
    );
    const id = this.ids.next();
    const reserved = await this.commands.reserve({
      id,
      tenantId: context.tenantId,
      accountId: input.accountId,
      positionId: null,
      idempotencyKey: input.idempotencyKey,
      action: "cancel_order",
      request: { ...input, orderId },
      status: "pending",
      result: null,
      error: null,
    });
    if (!reserved.claimed) {
      if (reserved.command.action !== "cancel_order") {
        throw new ConflictError("Idempotency key is already in use");
      }
      return response(reserved.command);
    }
    try {
      await connection.gateway.cancelOrder(connection.credentials, {
        orderId,
        symbol: input.symbol,
      });
      const result = {
        references: [orderId],
        message: "Заявка отменена",
      };
      await this.commands.complete(id, result);
      await this.audit.write({
        context,
        action: "exchange_order.cancel",
        aggregateType: "ExchangeOrder",
        aggregateId: orderId,
        payload: { accountId: input.accountId, commandId: id },
      });
      return { commandId: id, status: "completed" as const, ...result };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ошибка отмены";
      await this.commands.fail(id, message);
      return {
        commandId: id,
        status: "failed" as const,
        references: [],
        message,
      };
    }
  }
}

function response(
  command: import("../../domain/positions/position-command.js").PositionCommand,
) {
  return {
    commandId: command.id,
    status: command.status === "pending" ? "in_progress" as const : command.status,
    references: command.result?.references ?? [],
    message: command.result?.message ?? command.error ?? "Команда выполняется",
  };
}
