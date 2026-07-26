import type {
  CancelExchangeOrderInput,
  ExchangeActivityDto,
  PositionActionInput,
} from "@axiom/contracts";

export class DemoPositionActivityGateway {
  async list(): Promise<ExchangeActivityDto> {
    return {
      openOrders: [],
      recentOrders: [],
      recentTrades: [],
      failures: [],
      updatedAt: new Date().toISOString(),
    };
  }

  async manage(input: PositionActionInput) {
    return {
      commandId: `cmd_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      action: input.action,
      status: "completed" as const,
      references: ["demo-reference"],
      message: "Демо-команда выполнена",
    };
  }

  async cancel(_input: CancelExchangeOrderInput) {
    return {
      commandId: `cmd_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
      status: "completed" as const,
      references: ["demo-order"],
      message: "Демо-заявка отменена",
    };
  }
}
