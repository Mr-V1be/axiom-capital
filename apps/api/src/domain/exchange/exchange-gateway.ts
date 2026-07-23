import { AccountCredentials } from "../accounts/account-ports.js";
import { ExchangeName } from "../accounts/investor-account.js";

export interface ExchangeBalance {
  currency: string;
  equity: string;
  balances: Readonly<Record<string, string>>;
}

export interface ExchangeOrderRequest {
  symbol: string;
  side: "buy" | "sell";
  type: "market" | "limit";
  quoteAmount: string;
  limitPrice?: string;
  clientOrderId: string;
}

export interface ExchangeOrderResult {
  orderId: string;
  status: "accepted" | "filled";
}

export interface ExchangeGateway {
  verifyReadTradeOnly(credentials: AccountCredentials): Promise<void>;
  fetchBalance(credentials: AccountCredentials): Promise<ExchangeBalance>;
  placeOrder(
    credentials: AccountCredentials,
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrderResult>;
}

export interface ExchangeGatewayFactory {
  for(exchange: ExchangeName): ExchangeGateway;
}
