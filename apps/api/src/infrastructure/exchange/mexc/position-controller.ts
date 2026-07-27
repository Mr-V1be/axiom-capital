import { mexc } from "ccxt";
import { Decimal } from "decimal.js";
import {
  PositionActionRequest,
  PositionActionResult,
} from "../../../domain/exchange/exchange-gateway.js";
import { toMexcExternalOrderId } from "./external-order-id.js";

export class MexcPositionController {
  constructor(private readonly exchange: mexc) {}

  async execute(request: PositionActionRequest): Promise<PositionActionResult> {
    await this.exchange.loadMarkets();
    switch (request.action) {
      case "close":
        return this.close(request);
      case "set_leverage":
        return this.setLeverage(request);
      case "adjust_margin":
        return this.adjustMargin(request);
      case "place_protection":
        return this.placeProtection(request);
    }
  }

  private async close(
    request: Extract<PositionActionRequest, { action: "close" }>,
  ): Promise<PositionActionResult> {
    const order = await this.exchange.createOrder(
      request.position.symbol,
      request.orderType,
      opposite(request.position.side),
      Number(request.contracts),
      request.orderType === "limit" ? Number(request.limitPrice) : undefined,
      {
        reduceOnly: true,
        positionId: request.position.id,
        externalOid: toMexcExternalOrderId(request.clientOrderId),
      },
    );
    if (!order.id) throw new Error("MEXC returned no close order identifier");
    return {
      references: [String(order.id)],
      message: request.orderType === "market"
        ? "Команда закрытия позиции принята MEXC"
        : "Лимитная заявка на закрытие выставлена",
    };
  }

  private async setLeverage(
    request: Extract<PositionActionRequest, { action: "set_leverage" }>,
  ): Promise<PositionActionResult> {
    await this.exchange.setLeverage(
      request.leverage,
      request.position.symbol,
      { positionId: request.position.id },
    );
    return {
      references: [request.position.id],
      message: `Плечо позиции изменено на ×${request.leverage}`,
    };
  }

  private async adjustMargin(
    request: Extract<PositionActionRequest, { action: "adjust_margin" }>,
  ): Promise<PositionActionResult> {
    const method = request.direction === "add" ? "addMargin" : "reduceMargin";
    await this.exchange[method](
      request.position.symbol,
      Number(request.amount),
      { positionId: request.position.id },
    );
    return {
      references: [request.position.id],
      message: request.direction === "add"
        ? "Маржа добавлена к позиции"
        : "Маржа позиции уменьшена",
    };
  }

  private async placeProtection(
    request: Extract<PositionActionRequest, { action: "place_protection" }>,
  ): Promise<PositionActionResult> {
    const order = await this.exchange.createOrder(
      request.position.symbol,
      "market",
      opposite(request.position.side),
      Number(request.contracts),
      undefined,
      {
        reduceOnly: true,
        positionId: request.position.id,
        externalOid: toMexcExternalOrderId(request.clientOrderId),
        triggerPrice: Number(request.triggerPrice),
        triggerType: triggerType(request),
        executeCycle: 2,
        trend: priceSource(request.priceSource),
        orderType: 5,
      },
    );
    if (!order.id) throw new Error("MEXC returned no protection identifier");
    return {
      references: [String(order.id)],
      message: request.protectionType === "take_profit"
        ? "Take Profit установлен"
        : "Stop Loss установлен",
    };
  }
}

function opposite(side: "long" | "short"): "buy" | "sell" {
  return side === "long" ? "sell" : "buy";
}

function triggerType(
  request: Extract<PositionActionRequest, { action: "place_protection" }>,
): 1 | 2 {
  const rises = request.position.side === "long"
    ? request.protectionType === "take_profit"
    : request.protectionType === "stop_loss";
  return rises ? 1 : 2;
}

function priceSource(source: "last" | "mark" | "index"): 1 | 2 | 3 {
  return source === "last" ? 1 : source === "mark" ? 2 : 3;
}

export function validatePositionAction(request: PositionActionRequest): void {
  if ("contracts" in request) {
    const amount = new Decimal(request.contracts);
    if (!amount.isPositive() || amount.greaterThan(request.position.contracts)) {
      throw new Error("Contracts must be within the open position size");
    }
  }
  if (
    request.action === "close" &&
    request.orderType === "limit" &&
    !request.limitPrice
  ) {
    throw new Error("Limit price is required for a limit close");
  }
  if (
    request.action === "adjust_margin" &&
    request.position.marginMode !== "isolated"
  ) {
    throw new Error("Margin can only be adjusted for isolated positions");
  }
}
