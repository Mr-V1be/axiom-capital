import {
  ExchangeGateway,
  ExchangeGatewayFactory,
} from "../../domain/exchange/exchange-gateway.js";

export class DefaultExchangeGatewayFactory implements ExchangeGatewayFactory {
  constructor(private readonly mexcGateway: ExchangeGateway) {}

  for(exchange: "mexc"): ExchangeGateway {
    if (exchange === "mexc") return this.mexcGateway;
    throw new Error(`Unsupported exchange: ${exchange satisfies never}`);
  }
}
