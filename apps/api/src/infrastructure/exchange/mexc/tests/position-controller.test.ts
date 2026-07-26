import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mexc } from "ccxt";
import { ExchangePosition } from "../../../../domain/exchange/exchange-gateway.js";
import { MexcPositionController } from "../position-controller.js";

const position: ExchangePosition = {
  id: "position-1",
  symbol: "BTC/USDT:USDT",
  side: "long",
  contracts: "2",
  contractSize: "0.0001",
  baseAmount: "0.0002",
  entryPrice: "64000",
  currentPrice: "65000",
  liquidationPrice: null,
  leverage: "20",
  marginMode: "cross",
  notional: "13",
  initialMargin: "0.65",
  unrealizedPnl: "0.2",
  realizedPnl: null,
  roePercent: null,
  marginRatioPercent: null,
  openedAt: null,
  updatedAt: new Date(),
};

describe("MexcPositionController", () => {
  it("closes a long with an opposite reduce-only order", async () => {
    let call: unknown[] = [];
    const exchange = {
      async loadMarkets() {},
      async createOrder(...args: unknown[]) {
        call = args;
        return { id: "close-order" };
      },
    } as unknown as mexc;
    await new MexcPositionController(exchange).execute({
      action: "close",
      position,
      contracts: "1",
      orderType: "market",
      clientOrderId: "command-key",
    });

    assert.equal(call[2], "sell");
    assert.equal(call[3], 1);
    assert.deepEqual(call[5], {
      reduceOnly: true,
      positionId: "position-1",
      externalOid: "command-key",
    });
  });

  it("uses a downward market trigger for a long stop loss", async () => {
    let parameters: Record<string, unknown> = {};
    const exchange = {
      async loadMarkets() {},
      async createOrder(
        _symbol: string,
        _type: string,
        _side: string,
        _amount: number,
        _price: number | undefined,
        params: Record<string, unknown>,
      ) {
        parameters = params;
        return { id: "protection-order" };
      },
    } as unknown as mexc;
    await new MexcPositionController(exchange).execute({
      action: "place_protection",
      position,
      protectionType: "stop_loss",
      triggerPrice: "62000",
      contracts: "2",
      priceSource: "mark",
      clientOrderId: "command-key",
    });

    assert.equal(parameters.reduceOnly, true);
    assert.equal(parameters.triggerType, 2);
    assert.equal(parameters.trend, 2);
    assert.equal(parameters.orderType, 5);
  });
});
