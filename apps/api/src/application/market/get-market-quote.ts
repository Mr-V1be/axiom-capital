import { ExchangeGateway } from "../../domain/exchange/exchange-gateway.js";

export class GetMarketQuote {
  constructor(private readonly exchange: ExchangeGateway) {}

  execute(symbol: string, marketType: "spot" | "swap") {
    return this.exchange.fetchMarketQuote(symbol, marketType);
  }
}
