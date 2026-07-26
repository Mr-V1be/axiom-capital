import ccxt from "ccxt";
import { Decimal } from "decimal.js";
import { ExchangeMarketQuote } from "../../domain/exchange/exchange-gateway.js";
import { ExternalServiceError } from "../../domain/shared/domain-error.js";

export class MexcMarketData {
  async fetchQuote(
    symbol: string,
    marketType: "spot" | "swap",
  ): Promise<ExchangeMarketQuote> {
    try {
      const exchange = new ccxt.mexc({
        enableRateLimit: true,
        options: { defaultType: marketType },
      });
      await exchange.loadMarkets();
      const resolved = this.symbol(symbol, marketType);
      const ticker = await exchange.fetchTicker(resolved);
      const market = exchange.market(resolved);
      const price = ticker.last ?? ticker.close;
      if (price === undefined || !new Decimal(price).isPositive()) {
        throw new Error("MEXC returned no positive market price");
      }
      return {
        symbol,
        marketType,
        price: new Decimal(price).toFixed(),
        minimumOrderAmount:
          typeof market.limits.amount?.min === "number"
            ? new Decimal(market.limits.amount.min).toFixed()
            : null,
        contractSize:
          market.contract && typeof market.contractSize === "number"
            ? new Decimal(market.contractSize).toFixed()
            : null,
        changePercent24h:
          typeof ticker.percentage === "number" ? ticker.percentage : null,
        quoteVolume24h:
          typeof ticker.quoteVolume === "number"
            ? new Decimal(ticker.quoteVolume).toFixed()
            : null,
        updatedAt: new Date(ticker.timestamp ?? Date.now()),
      };
    } catch (error) {
      throw new ExternalServiceError("mexc", "Unable to fetch MEXC quote", {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  private symbol(symbol: string, marketType: "spot" | "swap"): string {
    if (marketType === "spot" || symbol.includes(":")) return symbol;
    const quote = symbol.split("/")[1];
    if (!quote) throw new Error(`Invalid swap symbol: ${symbol}`);
    return `${symbol}:${quote}`;
  }
}
