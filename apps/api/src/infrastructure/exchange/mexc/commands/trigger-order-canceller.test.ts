import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mexc } from "ccxt";
import { MexcTriggerOrderCanceller } from "./trigger-order-canceller.js";

function exchange(response: unknown) {
  const bodies: unknown[] = [];
  return {
    bodies,
    client: {
      async loadMarkets() {},
      market() { return { id: "BTC_USDT" }; },
      async contractPrivatePostPlanorderCancel(body: unknown) {
        bodies.push(body);
        return response;
      },
    } as unknown as mexc,
  };
}

describe("MexcTriggerOrderCanceller", () => {
  it("uses the plan-order payload required by MEXC", async () => {
    const fixture = exchange({ success: true, code: 0 });
    await new MexcTriggerOrderCanceller(fixture.client).cancel(
      "837125420401908736",
      "BTC/USDT:USDT",
    );
    assert.deepEqual(fixture.bodies, [[{
      symbol: "BTC_USDT",
      orderId: "837125420401908736",
    }]]);
  });

  it("rejects an unsuccessful MEXC response", async () => {
    const fixture = exchange({ success: false, message: "Parameter error" });
    await assert.rejects(
      () => new MexcTriggerOrderCanceller(fixture.client).cancel(
        "bad",
        "BTC/USDT:USDT",
      ),
      /Parameter error/,
    );
  });
});
