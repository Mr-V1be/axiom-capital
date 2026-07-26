import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MexcOrderSizer } from "./mexc-order-sizer.js";

const truncateContracts = (amount: string) =>
  Math.trunc(Number(amount)).toString();

describe("MexcOrderSizer", () => {
  it("uses margin multiplied by leverage for swap position sizing", () => {
    const result = new MexcOrderSizer().calculate({
      marketType: "swap",
      quoteAmount: "0.5",
      price: "64642",
      leverage: 20,
      contractSize: 0.0001,
      minimumAmount: 1,
      amountToPrecision: truncateContracts,
    });

    assert.equal(result.amount, 1);
    assert.equal(result.positionNotional, "10");
  });

  it("rejects a swap position below the exchange contract minimum", () => {
    assert.throws(
      () => new MexcOrderSizer().calculate({
        marketType: "swap",
        quoteAmount: "0.5",
        price: "64642",
        leverage: 1,
        contractSize: 0.0001,
        minimumAmount: 1,
        amountToPrecision: truncateContracts,
      }),
      /below MEXC minimum/,
    );
  });

  it("keeps spot sizing independent from leverage", () => {
    const result = new MexcOrderSizer().calculate({
      marketType: "spot",
      quoteAmount: "100",
      price: "50000",
      leverage: 20,
      minimumAmount: 0.000001,
      amountToPrecision: (amount) => Number(amount).toFixed(6),
    });

    assert.equal(result.amount, 0.002);
    assert.equal(result.positionNotional, "100");
  });
});
