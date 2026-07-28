import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mexc } from "ccxt";
import { toMexcExternalOrderId } from "../external-order-id.js";
import { MexcPositionController } from "../position-controller.js";

function position() {
  return {
    id: "position-1",
    symbol: "BTC/USDT:USDT",
    side: "long" as const,
    contracts: "1",
    contractSize: "0.0001",
    baseAmount: "0.0001",
    entryPrice: "64000",
    liquidationPrice: "32000",
    marginMode: "cross" as const,
    leverage: "20",
    currentPrice: "64000",
    notional: "6.4",
    initialMargin: "0.32",
    unrealizedPnl: "0",
    realizedPnl: "0",
    roePercent: "0",
    marginRatioPercent: "0.3",
    openedAt: null,
    updatedAt: new Date("2026-07-28T00:00:00Z"),
  };
}

function exchange(response: unknown) {
  const requests: Record<string, unknown>[] = [];
  const client = {
    async loadMarkets() {},
    market() { return { id: "BTC_USDT" }; },
    amountToPrecision(_symbol: string, amount: number) {
      return String(amount);
    },
    priceToPrecision(_symbol: string, price: number) {
      return String(price);
    },
    async contractPrivatePostPlanorderPlace(
      request: Record<string, unknown>,
    ) {
      requests.push(request);
      return response;
    },
  } as unknown as mexc;
  return { client, requests };
}

describe("MexcPositionController", () => {
  it("closes a long with an opposite reduce-only order", async () => {
    let call: unknown[] = [];
    const client = {
      async loadMarkets() {},
      async createOrder(...args: unknown[]) {
        call = args;
        return { id: "close-order" };
      },
    } as unknown as mexc;
    await new MexcPositionController(client).execute({
      action: "close",
      position: position(),
      contracts: "1",
      orderType: "market",
      clientOrderId: "close-command",
    });

    assert.equal(call[2], "sell");
    assert.equal(call[3], 1);
    const parameters = call[5] as Record<string, unknown>;
    assert.equal(parameters.reduceOnly, true);
    assert.equal(parameters.positionId, "position-1");
    assert.equal(
      parameters.externalOid,
      toMexcExternalOrderId("close-command"),
    );
  });

  it("uses the native plan-order endpoint and keeps a scalar MEXC id", async () => {
    const fixture = exchange({
      success: true,
      code: 0,
      data: "837125420401908736",
    });
    const result = await new MexcPositionController(fixture.client).execute({
      action: "place_protection",
      position: position(),
      contracts: "1",
      protectionType: "stop_loss",
      triggerPrice: "63000",
      priceSource: "mark",
      clientOrderId: "command-1",
    });

    assert.deepEqual(result.references, ["837125420401908736"]);
    assert.deepEqual(fixture.requests[0], {
      symbol: "BTC_USDT",
      vol: 1,
      side: 4,
      openType: 2,
      positionId: "position-1",
      externalOid: toMexcExternalOrderId("command-1"),
      triggerPrice: "63000",
      triggerType: 2,
      executeCycle: 2,
      trend: 2,
      orderType: 5,
    });
  });

  it("surfaces a rejected plan-order response", async () => {
    const fixture = exchange({
      success: false,
      code: 600,
      message: "Parameter error",
      data: null,
    });

    await assert.rejects(
      () => new MexcPositionController(fixture.client).execute({
        action: "place_protection",
        position: position(),
        contracts: "1",
        protectionType: "take_profit",
        triggerPrice: "65000",
        priceSource: "last",
        clientOrderId: "command-2",
      }),
      /Parameter error/,
    );
  });
});
