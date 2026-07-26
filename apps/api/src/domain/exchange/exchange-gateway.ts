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

export interface ExchangePosition {
  id: string;
  symbol: string;
  side: "long" | "short";
  contracts: string;
  contractSize: string;
  baseAmount: string;
  entryPrice: string | null;
  currentPrice: string | null;
  liquidationPrice: string | null;
  leverage: string | null;
  marginMode: "cross" | "isolated" | null;
  notional: string | null;
  initialMargin: string | null;
  unrealizedPnl: string | null;
  realizedPnl: string | null;
  roePercent: string | null;
  marginRatioPercent: string | null;
  openedAt: Date | null;
  updatedAt: Date;
}

export type CapabilityState = "available" | "unavailable" | "unknown";

export interface ExchangeCapability {
  state: CapabilityState;
  code?: string;
}

export interface ExchangeAccountDetails {
  profile: {
    accountType: string | null;
    canTrade: boolean | null;
    canWithdraw: boolean | null;
    canDeposit: boolean | null;
    permissions: string[];
  };
  kyc: {
    level: "unverified" | "primary" | "advanced" | "institutional" | "unknown";
    rawStatus: string | null;
  };
  capabilities: {
    spotAccountRead: ExchangeCapability;
    spotOrderRead: ExchangeCapability;
    spotOrderWrite: ExchangeCapability;
    depositRead: ExchangeCapability;
    transferRead: ExchangeCapability;
    withdrawRead: ExchangeCapability;
    transferWrite: ExchangeCapability;
    withdrawWrite: ExchangeCapability;
    futuresAccountRead: ExchangeCapability;
    futuresOrderRead: ExchangeCapability;
    futuresOrderWrite: ExchangeCapability;
  };
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
    total: string;
  }>;
  allowedSymbols: string[];
  checkedAt: Date;
}

export interface ExchangeMarketQuote {
  symbol: string;
  marketType: "spot" | "swap";
  price: string;
  minimumOrderAmount: string | null;
  contractSize: string | null;
  changePercent24h: number | null;
  quoteVolume24h: string | null;
  updatedAt: Date;
}

export interface ExchangeGateway {
  verifyAccess(
    credentials: AccountCredentials,
    accessMode: AccountAccessMode,
  ): Promise<void>;
  fetchBalance(credentials: AccountCredentials): Promise<ExchangeBalance>;
  fetchPositions(credentials: AccountCredentials): Promise<ExchangePosition[]>;
  fetchOpenPositions(credentials: AccountCredentials): Promise<number>;
  fetchAccountDetails(
    credentials: AccountCredentials,
  ): Promise<ExchangeAccountDetails>;
  fetchMarketQuote(
    symbol: string,
    marketType: "spot" | "swap",
  ): Promise<ExchangeMarketQuote>;
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
