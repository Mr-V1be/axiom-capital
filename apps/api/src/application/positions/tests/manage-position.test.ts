import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ExchangeGateway, ExchangePosition } from "../../../domain/exchange/exchange-gateway.js";
import {
  PositionCommand,
  PositionCommandRepository,
} from "../../../domain/positions/position-command.js";
import { AuditWriter } from "../../shared/context.js";
import { OrderExecutionAccess } from "../../trading/order-execution-access.js";
import { ManagePosition } from "../manage-position.js";

const context = {
  tenantId: "tenant_000000000000001",
  actorId: "owner",
  requestId: "request",
};
const position: ExchangePosition = {
  id: "1453672849",
  symbol: "BTC/USDT:USDT",
  side: "long",
  contracts: "10",
  contractSize: "0.0001",
  baseAmount: "0.001",
  entryPrice: "64000",
  currentPrice: "65000",
  liquidationPrice: "15000",
  leverage: "20",
  marginMode: "cross",
  notional: "65",
  initialMargin: "3.25",
  unrealizedPnl: "1",
  realizedPnl: "0",
  roePercent: "30",
  marginRatioPercent: "1",
  openedAt: null,
  updatedAt: new Date(),
};

describe("ManagePosition", () => {
  it("executes a repeated command only once", async () => {
    const commands = new MemoryCommands();
    let executions = 0;
    const useCase = fixture(commands, async () => {
      executions += 1;
      return { references: ["mexc-order"], message: "accepted" };
    });
    const input = {
      action: "close" as const,
      contracts: "5",
      orderType: "market" as const,
      idempotencyKey: "command-key-00000001",
      confirmed: true as const,
    };

    const first = await useCase.execute(
      context,
      "account_00000000000001",
      position.id,
      input,
    );
    const replay = await useCase.execute(
      context,
      "account_00000000000001",
      position.id,
      input,
    );

    assert.equal(executions, 1);
    assert.equal(first.status, "completed");
    assert.equal(replay.status, "completed");
    assert.deepEqual(replay.references, ["mexc-order"]);
  });

  it("rejects a long take-profit below the current price", async () => {
    const useCase = fixture(new MemoryCommands(), async () => {
      throw new Error("must not execute");
    });
    await assert.rejects(
      useCase.execute(context, "account_00000000000001", position.id, {
        action: "place_protection",
        protectionType: "take_profit",
        triggerPrice: "64000",
        contracts: "10",
        priceSource: "mark",
        idempotencyKey: "command-key-00000002",
        confirmed: true,
      }),
      /неверной стороны/,
    );
  });

  it("rejects a close larger than the position", async () => {
    const useCase = fixture(new MemoryCommands(), async () => {
      throw new Error("must not execute");
    });
    await assert.rejects(
      useCase.execute(context, "account_00000000000001", position.id, {
        action: "close",
        contracts: "11",
        orderType: "market",
        idempotencyKey: "command-key-00000003",
        confirmed: true,
      }),
      /превышает открытую позицию/,
    );
  });
});

function fixture(
  commands: PositionCommandRepository,
  execute: ExchangeGateway["executePositionAction"],
) {
  const gateway = {
    async fetchPositions() { return [position]; },
    executePositionAction: execute,
  } as unknown as ExchangeGateway;
  const access = {
    async forAccount() {
      return {
        gateway,
        credentials: { apiKey: "key", secret: "secret", marketType: "swap" },
      };
    },
  } as unknown as OrderExecutionAccess;
  const audit: AuditWriter = { async write() {} };
  return new ManagePosition(access, commands, audit, { next: () => "command-id" });
}

class MemoryCommands implements PositionCommandRepository {
  private value: PositionCommand | null = null;

  async reserve(command: PositionCommand) {
    if (this.value) return { claimed: false, command: this.value };
    this.value = command;
    return { claimed: true, command };
  }

  async complete(
    _id: string,
    result: { references: string[]; message: string },
  ) {
    this.value = { ...this.value!, status: "completed", result };
  }

  async fail(_id: string, message: string) {
    this.value = { ...this.value!, status: "failed", error: message };
  }
}
