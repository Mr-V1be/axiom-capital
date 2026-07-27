import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MexcOrderCanceller } from "./order-canceller.js";

describe("MexcOrderCanceller", () => {
  it("accepts the desired state when MEXC errors after cancelling", async () => {
    const canceller = new MexcOrderCanceller(async () => undefined);
    await canceller.cancel({
      async cancelOrder() {
        throw new Error("order state cannot be cancelled");
      },
      async fetchOpenOrders() {
        return [];
      },
    }, "order-1", "BTC/USDT:USDT");
  });

  it("retries while the order remains open", async () => {
    let calls = 0;
    const canceller = new MexcOrderCanceller(async () => undefined);
    await canceller.cancel({
      async cancelOrder() {
        calls += 1;
        if (calls === 1) throw new Error("temporary MEXC failure");
      },
      async fetchOpenOrders() {
        return [{ id: "order-1" }];
      },
    }, "order-1", "BTC/USDT:USDT");
    assert.equal(calls, 2);
  });
});
