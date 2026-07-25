import { AccountCredentials } from "../accounts/account-ports.js";
import {
  AccountAccessMode,
  ExchangeName,
} from "../accounts/investor-account.js";

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
  leverage?: number;
  marginMode?: "cross" | "isolated";
  reduceOnly?: boolean;
}

export interface ExchangeOrderResult {
  orderId: string;
  status: "accepted" | "partially_filled" | "filled" | "cancelled";
  filledQuote: string;
  remainingQuote: string;
  averagePrice?: string;
}

export interface ExchangeOrderReference {
  orderId: string;
  symbol: string;
}

export interface ExchangeGateway {
  verifyAccess(
    credentials: AccountCredentials,
    accessMode: AccountAccessMode,
  ): Promise<void>;
  fetchBalance(credentials: AccountCredentials): Promise<ExchangeBalance>;
  fetchOpenPositions(credentials: AccountCredentials): Promise<number>;
  placeOrder(
    credentials: AccountCredentials,
    request: ExchangeOrderRequest,
  ): Promise<ExchangeOrderResult>;
  fetchOrder(
    credentials: AccountCredentials,
    reference: ExchangeOrderReference,
  ): Promise<ExchangeOrderResult>;
  cancelOrder(
    credentials: AccountCredentials,
    reference: ExchangeOrderReference,
  ): Promise<ExchangeOrderResult>;
}

export interface ExchangeGatewayFactory {
  for(exchange: ExchangeName): ExchangeGateway;
}
