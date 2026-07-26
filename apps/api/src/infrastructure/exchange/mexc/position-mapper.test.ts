import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MexcPositionMapper } from "./position-mapper.js";

describe("MexcPositionMapper", () => {
  it("maps live MEXC fields and derives the current price", () => {
    const position = new MexcPositionMapper().map({
      id: "1453672849",
      symbol: "BTC/USDT:USDT",
      side: "long",
      contracts: 1,
      contractSize: 0.0001,
      entryPrice: 64677.4,
      leverage: 20,
      liquidationPrice: 14799.7,
      marginMode: "cross",
      info: {
        positionId: "1453672849",
        holdAvgPrice: "64677.4",
        im: "0.328561192",
        unRealizedPnl: "0.00627",
        realised: "-0.0051",
        marginRatio: "0.0018",
        createTime: "1785100000000",
        updateTime: "1785100100000",
      },
    }, new Date("2026-07-26T20:00:00.000Z"));

    assert.ok(position);
    assert.equal(position.baseAmount, "0.0001");
    assert.equal(position.currentPrice, "64740.1");
    assert.equal(position.notional, "6.47401");
    assert.equal(position.unrealizedPnl, "0.00627");
    assert.equal(position.realizedPnl, "-0.0051");
    assert.equal(position.marginMode, "cross");
  });

  it("ignores positions without an open contract", () => {
    const position = new MexcPositionMapper().map({
      symbol: "BTC/USDT:USDT",
      contracts: 0,
    }, new Date());

    assert.equal(position, null);
  });
});
