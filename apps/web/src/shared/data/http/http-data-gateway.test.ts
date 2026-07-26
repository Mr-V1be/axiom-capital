import assert from "node:assert/strict";
import { it } from "node:test";
import { SessionStore } from "../../auth/session-store";
import { HttpDataGateway } from "../http-data-gateway";

it("does not send a JSON content type for an empty synchronization request", async () => {
  const originalFetch = globalThis.fetch;
  let headers = new Headers();
  globalThis.fetch = async (_input, init) => {
    headers = new Headers(init?.headers);
    return new Response("{}", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const gateway = new HttpDataGateway("https://example.test", new SessionStore());
    await gateway.syncBatchOrder("batch_1");
    assert.equal(headers.has("content-type"), false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
