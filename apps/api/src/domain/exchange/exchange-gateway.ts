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
  kind?: "regular" | "trigger";
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

export interface ExchangeActivityOrder {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  type: string;
  status: string;
  amount: string;
  filled: string;
  remaining: string;
  price: string | null;
  averagePrice: string | null;
  reduceOnly: boolean;
  kind: "regular" | "trigger";
  triggerPrice: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ExchangeActivityTrade {
  id: string;
  orderId: string | null;
  symbol: string;
  side: "buy" | "sell";
  price: string;
  amount: string;
  cost: string;
  fee: string | null;
  feeCurrency: string | null;
  realizedPnl: string | null;
  createdAt: Date | null;
}

export interface ExchangeActivity {
  openOrders: ExchangeActivityOrder[];
  recentOrders: ExchangeActivityOrder[];
  recentTrades: ExchangeActivityTrade[];
}

export type PositionActionRequest =
  | {
      action: "close";
      position: ExchangePosition;
      contracts: string;
      orderType: "market" | "limit";
      limitPrice?: string;
      clientOrderId: string;
    }
  | {
      action: "set_leverage";
      position: ExchangePosition;
      leverage: number;
    }
  | {
      action: "adjust_margin";
      position: ExchangePosition;
      direction: "add" | "reduce";
      amount: string;
    }
  | {
      action: "place_protection";
      position: ExchangePosition;
      protectionType: "take_profit" | "stop_loss";
      triggerPrice: string;
      contracts: string;
      priceSource: "last" | "mark" | "index";
      clientOrderId: string;
    };

export interface PositionActionResult {
  references: string[];
  message: string;
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
  fetchActivity(credentials: AccountCredentials): Promise<ExchangeActivity>;
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
  executePositionAction(
    credentials: AccountCredentials,
    request: PositionActionRequest,
  ): Promise<PositionActionResult>;
}

export interface ExchangeGatewayFactory {
  for(exchange: ExchangeName): ExchangeGateway;
}
