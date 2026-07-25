import assert from "node:assert/strict";
import { it } from "node:test";
import type { mexc } from "ccxt";
import { MexcAccountInspector } from "./mexc-account-inspector.js";

class AuthenticationError extends Error {}

it("collects safe MEXC account details and denied futures capabilities", async () => {
  let testOrders = 0;
  const denied = () => {
    throw new AuthenticationError(
      'mexc {"success":false,"code":700007,"message":"No permission"}',
    );
  };
  const client = {
    async spotPrivateGetAccount() {
      return {
        accountType: "SPOT",
        canTrade: true,
        canWithdraw: true,
        canDeposit: true,
        permissions: ["SPOT"],
        balances: [
          { asset: "USDT", free: "12.5", locked: "2.5" },
          { asset: "BTC", free: "0", locked: "0" },
        ],
      };
    },
    async spotPrivateGetOpenOrders() { return []; },
    async spotPrivatePostOrderTest() {
      testOrders += 1;
      return {};
    },
    async spotPrivateGetCapitalDepositHisrec() { return []; },
    async spotPrivateGetCapitalTransfer() { return []; },
    async spotPrivateGetCapitalWithdrawAddress() { return []; },
    async spotPrivateGetKycStatus() { return { status: "1" }; },
    async spotPrivateGetSelfSymbols() {
      return { data: ["ETHUSDT", "BTCUSDT", "BTCUSDT"] };
    },
    async contractPrivateGetAccountAssets() { return denied(); },
    async contractPrivateGetOrderListOpenOrders() { return denied(); },
    async contractPrivateGetPositionPositionMode() { return denied(); },
  } as unknown as mexc;

  const details = await new MexcAccountInspector(
    client,
    () => new Date("2026-07-25T20:00:00.000Z"),
  ).inspect();

  assert.equal(testOrders, 1);
  assert.deepEqual(details.profile, {
    accountType: "SPOT",
    canTrade: true,
    canWithdraw: true,
    canDeposit: true,
    permissions: ["SPOT"],
  });
  assert.deepEqual(details.balances, [{
    asset: "USDT",
    free: "12.5",
    locked: "2.5",
    total: "15",
  }]);
  assert.deepEqual(details.allowedSymbols, ["BTCUSDT", "ETHUSDT"]);
  assert.deepEqual(details.kyc, { level: "unverified", rawStatus: "1" });
  assert.equal(details.capabilities.spotOrderWrite.state, "available");
  assert.deepEqual(details.capabilities.futuresAccountRead, {
    state: "unavailable",
    code: "700007",
  });
  assert.equal(details.capabilities.withdrawWrite.state, "unknown");
  assert.equal(
    details.checkedAt.toISOString(),
    "2026-07-25T20:00:00.000Z",
  );
});
