import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { InvestorAccountDto } from "@axiom/contracts";
import {
  emptyAccountFilters,
  matchesAccountFilters,
} from "./AccountFilters.js";

const account = {
  marketType: "swap",
  accessMode: "trade",
  status: "connected",
} as InvestorAccountDto;

describe("account filters", () => {
  it("matches every account when filters are reset", () => {
    assert.equal(matchesAccountFilters(account, emptyAccountFilters), true);
  });

  it("combines market, access and status filters", () => {
    assert.equal(matchesAccountFilters(account, {
      market: "swap",
      access: "trade",
      status: "connected",
    }), true);
    assert.equal(matchesAccountFilters(account, {
      market: "spot",
      access: "trade",
      status: "connected",
    }), false);
  });
});
