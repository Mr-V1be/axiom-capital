import { Money } from "../shared/money.js";
import { Settlement } from "./settlement.js";

export interface SettlementAnchor {
  periodEnd: Date;
  highWaterMark: Money;
}

export interface SettlementRepository {
  latestAnchor(accountId: string): Promise<SettlementAnchor | null>;
  save(settlement: Settlement): Promise<void>;
  list(
    tenantId: string,
    page: { cursor?: string; limit: number },
  ): Promise<{ items: Settlement[]; nextCursor?: string }>;
}

export interface SplitAddressBook {
  getImmutableSplit(accountId: string): Promise<string | null>;
}
