import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  initialAccountDraft,
  toConnectAccountInput,
} from "./account-form.js";

describe("account connection form", () => {
  it("omits the subaccount identifier for a standalone account", () => {
    const input = toConnectAccountInput({
      ...initialAccountDraft,
      label: " Main Spot ",
      investorName: " Evgeni ",
      accountScope: "standalone",
      apiKey: " key-with-enough-length ",
      secret: " secret-with-enough-length ",
      externalAccountId: "",
      withdrawDisabledConfirmed: true,
    });

    assert.equal(input.label, "Main Spot");
    assert.equal(input.investorName, "Evgeni");
    assert.equal(input.apiKey, "key-with-enough-length");
    assert.equal(input.secret, "secret-with-enough-length");
    assert.equal("externalAccountId" in input, false);
  });

  it("keeps a normalized identifier for a subaccount", () => {
    const input = toConnectAccountInput({
      ...initialAccountDraft,
      label: "Growth",
      investorName: "Roman",
      apiKey: "key-with-enough-length",
      secret: "secret-with-enough-length",
      externalAccountId: " growth-01 ",
      withdrawDisabledConfirmed: true,
    });

    assert.equal(input.externalAccountId, "growth-01");
  });
});
