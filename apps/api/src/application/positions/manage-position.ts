import { PositionActionInput } from "@axiom/contracts";
import { Decimal } from "decimal.js";
import {
  ExchangePosition,
  PositionActionRequest,
} from "../../domain/exchange/exchange-gateway.js";
import { PositionCommandRepository } from "../../domain/positions/position-command.js";
import {
  ConflictError,
  NotFoundError,
  PolicyViolationError,
} from "../../domain/shared/domain-error.js";
import { IdGenerator } from "../../domain/shared/id.js";
import { OrderExecutionAccess } from "../trading/order-execution-access.js";
import { AuditWriter, RequestContext } from "../shared/context.js";

export class ManagePosition {
  constructor(
    private readonly access: OrderExecutionAccess,
    private readonly commands: PositionCommandRepository,
    private readonly audit: AuditWriter,
    private readonly ids: IdGenerator,
  ) {}

  async execute(
    context: RequestContext,
    accountId: string,
    positionId: string,
    input: PositionActionInput,
  ) {
    const connection = await this.access.forAccount(context.tenantId, accountId);
    const positions = await connection.gateway.fetchPositions(
      connection.credentials,
    );
    const position = positions.find((item) => item.id === positionId);
    if (!position) throw new NotFoundError("Position", positionId);
    validate(position, input);

    const commandId = this.ids.next();
    const reserved = await this.commands.reserve({
      id: commandId,
      tenantId: context.tenantId,
      accountId,
      positionId,
      idempotencyKey: input.idempotencyKey,
      action: input.action,
      request: input,
      status: "pending",
      result: null,
      error: null,
    });
    if (!reserved.claimed) return replay(reserved.command, input.action);

    try {
      const result = await connection.gateway.executePositionAction(
        connection.credentials,
        exchangeRequest(position, input),
      );
      await this.commands.complete(commandId, result);
      await this.audit.write({
        context,
        action: `position.${input.action}`,
        aggregateType: "Position",
        aggregateId: positionId,
        payload: { accountId, commandId, references: result.references },
      });
      return {
        commandId,
        action: input.action,
        status: "completed" as const,
        ...result,
      };
    } catch (error) {
      const message = readable(error);
      await this.commands.fail(commandId, message);
      return {
        commandId,
        action: input.action,
        status: "failed" as const,
        references: [],
        message,
      };
    }
  }
}

function exchangeRequest(
  position: ExchangePosition,
  input: PositionActionInput,
): PositionActionRequest {
  if (input.action === "close") {
    return {
      ...input,
      position,
      clientOrderId: input.idempotencyKey,
    };
  }
  if (input.action === "place_protection") {
    return {
      ...input,
      position,
      clientOrderId: input.idempotencyKey,
    };
  }
  return { ...input, position };
}

function validate(
  position: ExchangePosition,
  input: PositionActionInput,
): void {
  if ("contracts" in input) {
    const contracts = new Decimal(input.contracts);
    if (!contracts.isPositive() ||
        contracts.greaterThan(position.contracts)) {
      throw new PolicyViolationError(
        "Размер команды превышает открытую позицию",
        "position_size",
      );
    }
  }
  if (input.action === "close" &&
      input.orderType === "limit" &&
      !input.limitPrice) {
    throw new PolicyViolationError(
      "Для лимитного закрытия нужна цена",
      "limit_price",
    );
  }
  if (input.action === "adjust_margin" &&
      position.marginMode !== "isolated") {
    throw new PolicyViolationError(
      "Маржу можно менять только у изолированной позиции",
      "margin_mode",
    );
  }
  if (input.action === "place_protection" && position.currentPrice) {
    validateTrigger(position, input);
  }
}

function validateTrigger(
  position: ExchangePosition,
  input: Extract<PositionActionInput, { action: "place_protection" }>,
): void {
  const trigger = new Decimal(input.triggerPrice);
  const current = new Decimal(position.currentPrice!);
  const above = trigger.greaterThan(current);
  const expectedAbove = position.side === "long"
    ? input.protectionType === "take_profit"
    : input.protectionType === "stop_loss";
  if (above !== expectedAbove || trigger.equals(current)) {
    throw new PolicyViolationError(
      "Цена срабатывания находится с неверной стороны от текущей цены",
      "trigger_direction",
    );
  }
}

function replay(
  command: import("../../domain/positions/position-command.js").PositionCommand,
  action: string,
) {
  if (command.action !== action) {
    throw new ConflictError("Idempotency key is already used by another action");
  }
  return {
    commandId: command.id,
    action,
    status: command.status === "pending" ? "in_progress" as const : command.status,
    references: command.result?.references ?? [],
    message: command.result?.message ?? command.error ?? "Команда выполняется",
  };
}

function readable(error: unknown): string {
  return error instanceof Error ? error.message : "MEXC отклонила команду";
}
