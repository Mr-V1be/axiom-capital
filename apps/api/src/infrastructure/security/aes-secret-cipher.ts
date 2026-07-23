import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { SecretCipher } from "../../application/shared/context.js";

export class AesGcmSecretCipher implements SecretCipher {
  private readonly key: Buffer;

  constructor(base64Key: string) {
    this.key = Buffer.from(base64Key, "base64");
    if (this.key.length !== 32) {
      throw new Error("KEY_ENCRYPTION_KEY must decode to exactly 32 bytes");
    }
  }

  async encrypt(plainText: string): Promise<string> {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return ["v1", iv, tag, encrypted]
      .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
      .join(".");
  }

  async decrypt(cipherText: string): Promise<string> {
    const [version, ivPart, tagPart, payloadPart] = cipherText.split(".");
    if (version !== "v1" || !ivPart || !tagPart || !payloadPart) {
      throw new Error("Unsupported encrypted secret format");
    }
    for (const part of [ivPart, tagPart, payloadPart]) {
      if (Buffer.from(part, "base64url").toString("base64url") !== part) {
        throw new Error("Encrypted secret is not canonically encoded");
      }
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(payloadPart, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}
