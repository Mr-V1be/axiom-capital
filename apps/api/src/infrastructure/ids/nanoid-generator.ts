import { customAlphabet } from "nanoid";
import { IdGenerator } from "../../domain/shared/id.js";

const generate = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_-",
  24,
);

export class NanoIdGenerator implements IdGenerator {
  next(): string {
    return generate();
  }
}
