import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { describe, it } from "node:test";
import { AesGcmSecretCipher } from "./aes-secret-cipher.js";

describe("AesGcmSecretCipher", () => {
  it("round-trips a secret without deterministic ciphertext", async () => {
    const cipher = new AesGcmSecretCipher(randomBytes(32).toString("base64"));
    const first = await cipher.encrypt("exchange-secret");
    const second = await cipher.encrypt("exchange-secret");

    assert.notEqual(first, second);
    assert.equal(await cipher.decrypt(first), "exchange-secret");
    assert.equal(await cipher.decrypt(second), "exchange-secret");
  });

  it("detects ciphertext tampering", async () => {
    const cipher = new AesGcmSecretCipher(randomBytes(32).toString("base64"));
    const encrypted = await cipher.encrypt("exchange-secret");
    await assert.rejects(() => cipher.decrypt(`${encrypted}x`));
  });
});
