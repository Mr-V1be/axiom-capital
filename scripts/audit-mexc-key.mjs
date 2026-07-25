import { readFile } from "node:fs/promises";
import ccxt from "ccxt";

const [apiKey, secret] = (await readFile("/dev/stdin", "utf8"))
  .split(/\r?\n/)
  .map((value) => value.trim());

if (!apiKey || !secret) {
  throw new Error("Two credential lines are required");
}

const exchange = new ccxt.mexc({
  apiKey,
  secret,
  enableRateLimit: true,
});

function failure(error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.match(/"code"\s*:\s*"?(-?\d+)"?/)?.[1] ?? null;

  return {
    allowed: false,
    code,
    category: error?.constructor?.name ?? "Error",
  };
}

async function check(operation) {
  try {
    return {
      allowed: true,
      value: await operation(),
    };
  } catch (error) {
    return failure(error);
  }
}

const spotAccount = await check(async () => {
  const account = await exchange.spotPrivateGetAccount();

  return {
    canTrade: account.canTrade ?? null,
    canWithdraw: account.canWithdraw ?? null,
    canDeposit: account.canDeposit ?? null,
    accountType: account.accountType ?? null,
    permissions: account.permissions ?? [],
  };
});

const spotOrderRead = await check(async () => {
  await exchange.spotPrivateGetOpenOrders({ symbol: "BTCUSDT" });
  return "verified";
});

const spotOrderWrite = await check(async () => {
  await exchange.spotPrivatePostOrderTest({
    symbol: "BTCUSDT",
    side: "BUY",
    type: "LIMIT",
    timeInForce: "GTC",
    quantity: "0.001",
    price: "10000",
  });
  return "verified-with-non-matching-test-endpoint";
});

const transferRead = await check(async () => {
  await exchange.spotPrivateGetCapitalTransfer({
    fromAccountType: "SPOT",
    toAccountType: "FUTURES",
    page: 1,
    size: 1,
  });
  return "verified";
});

const withdrawRead = await check(async () => {
  await exchange.spotPrivateGetCapitalWithdrawAddress({
    coin: "USDT",
  });
  return "verified";
});

const depositRead = await check(async () => {
  await exchange.spotPrivateGetCapitalDepositHisrec({
    coin: "USDT",
    limit: 1,
  });
  return "verified";
});

const kycStatus = await check(async () => {
  const response = await exchange.spotPrivateGetKycStatus();
  return response?.status ?? null;
});

const futuresAccountRead = await check(async () => {
  await exchange.contractPrivateGetAccountAssets();
  return "verified";
});

const futuresOrderRead = await check(async () => {
  await exchange.contractPrivateGetOrderListOpenOrders();
  return "verified";
});

const futuresTrading = await check(async () => {
  const response = await exchange.contractPrivateGetPositionPositionMode();
  return {
    verified: true,
    positionMode: response?.data ?? null,
  };
});

console.log(JSON.stringify({
  spotAccount,
  spotOrderRead,
  spotOrderWrite,
  transferRead,
  withdrawRead,
  depositRead,
  kycStatus,
  futuresAccountRead,
  futuresOrderRead,
  futuresTrading,
}, null, 2));
