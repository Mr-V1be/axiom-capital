import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MexcOrderNormalizer,
  normalizeActivityOrder,
} from "./order-normalizer.js";

describe("MexcOrderNormalizer", () => {
  it("uses futures margin instead of the leveraged notional", () => {
    const order = new MexcOrderNormalizer().normalize({
      id: "836432465131297280",
      status: "closed",
      amount: 1,
      filled: 1,
      cost: 6.46774,
      average: 64677.4,
      info: {
        vol: "1",
        dealVol: "1",
        orderMargin: "0.33373538",
      },
    }, "swap");

    assert.equal(order.status, "filled");
    assert.equal(order.filledQuote, "0.33373538");
    assert.equal(order.remainingQuote, "0");
  });

  it("keeps requested futures margin while an order is open", () => {
    const order = new MexcOrderNormalizer().normalize({
      id: "pending",
      status: "open",
      amount: 2,
      filled: 1,
      average: 64000,
      info: { vol: "2", dealVol: "1" },
    }, "swap", "0.5");

    assert.equal(order.status, "partially_filled");
    assert.equal(order.filledQuote, "0.25");
    assert.equal(order.remainingQuote, "0.25");
  });

  it("normalizes an acknowledgement-only futures response", () => {
    const order = new MexcOrderNormalizer().normalize({
      id: "accepted-order",
    }, "swap", "0.35");

    assert.equal(order.status, "accepted");
    assert.equal(order.filledQuote, "0");
    assert.equal(order.remainingQuote, "0.35");
    assert.equal(order.averagePrice, undefined);
  });

  it("preserves quote normalization for spot orders", () => {
    const order = new MexcOrderNormalizer().normalize({
      id: "spot",
      status: "closed",
      filled: 0.001,
      cost: 64,
      average: 64000,
    }, "spot");

    assert.equal(order.filledQuote, "64");
    assert.equal(order.status, "filled");
  });

  it("maps every MEXC futures side without relying on incomplete CCXT fields", () => {
    assert.deepEqual(
      normalizeActivityOrder({ info: { side: "1", orderType: "1" } }),
      { side: "buy", type: "limit", reduceOnly: false },
    );
    assert.deepEqual(
      normalizeActivityOrder({ info: { side: "2", orderType: "5" } }),
      { side: "buy", type: "market", reduceOnly: true },
    );
    assert.deepEqual(
      normalizeActivityOrder({ info: { side: "3", orderType: "1" } }),
      { side: "sell", type: "limit", reduceOnly: false },
    );
    assert.deepEqual(
      normalizeActivityOrder({ info: { side: "4", orderType: "6" } }),
      { side: "sell", type: "market", reduceOnly: true },
    );
  });
});
