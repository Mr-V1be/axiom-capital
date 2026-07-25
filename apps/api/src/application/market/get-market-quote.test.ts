import assert from "node:assert/strict";
import { it } from "node:test";
import { ExchangeGateway } from "../../domain/exchange/exchange-gateway.js";
import { GetMarketQuote } from "./get-market-quote.js";

it("returns a normalized quote from the configured exchange", async () => {
  const gateway = {
    async fetchMarketQuote(
      symbol: string,
      marketType: "spot" | "swap",
    ) {
      return {
        symbol,
        marketType,
        price: "118420.1",
        changePercent24h: 2.84,
        quoteVolume24h: "2410000000",
        updatedAt: new Date("2026-07-25T20:00:00.000Z"),
      };
    },
  } as unknown as ExchangeGateway;

  const quote = await new GetMarketQuote(gateway).execute(
    "BTC/USDT",
    "spot",
  );

  assert.equal(quote.symbol, "BTC/USDT");
  assert.equal(quote.marketType, "spot");
  assert.equal(quote.price, "118420.1");
});
