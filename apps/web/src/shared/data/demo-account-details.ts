import type {
  AccountDetailsDto,
  InvestorAccountDto,
} from "@axiom/contracts";

const available = { state: "available" as const };
const unavailable = { state: "unavailable" as const, code: "700007" };
const unknown = { state: "unknown" as const };

export function demoAccountDetails(
  account: InvestorAccountDto,
): AccountDetailsDto {
  const futures = account.marketType === "swap" ? available : unavailable;

  return {
    account,
    profile: {
      accountType: account.marketType === "spot" ? "SPOT" : "CONTRACT",
      canTrade: account.permissions.trade,
      canWithdraw: false,
      canDeposit: true,
      permissions: [account.marketType === "spot" ? "SPOT" : "CONTRACT"],
    },
    kyc: { level: "advanced", rawStatus: "3" },
    capabilities: {
      spotAccountRead: available,
      spotOrderRead: available,
      spotOrderWrite: account.permissions.trade ? available : unavailable,
      depositRead: available,
      transferRead: available,
      withdrawRead: unavailable,
      transferWrite: unknown,
      withdrawWrite: unknown,
      futuresAccountRead: futures,
      futuresOrderRead: futures,
      futuresOrderWrite: account.permissions.trade ? futures : unavailable,
    },
    balances: [{
      asset: "USDT",
      free: account.equity.amount,
      locked: "0",
      total: account.equity.amount,
    }],
    allowedSymbols: ["BTCUSDT", "ETHUSDT"],
    checkedAt: new Date().toISOString(),
  };
}
