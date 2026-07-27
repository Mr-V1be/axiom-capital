import { createHash } from "node:crypto";

const MEXC_EXTERNAL_ORDER_ID_LENGTH = 32;
const PREFIX = "ax_";

export function toMexcExternalOrderId(idempotencyKey: string): string {
  const digest = createHash("sha256")
    .update(idempotencyKey)
    .digest("hex");

  return `${PREFIX}${digest.slice(
    0,
    MEXC_EXTERNAL_ORDER_ID_LENGTH - PREFIX.length,
  )}`;
}
