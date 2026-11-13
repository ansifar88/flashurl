
import { randomInt } from "node:crypto";

const BASE62_CHARACTERS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const DEFAULT_CODE_LENGTH = 10;

/**
 * Generates a cryptographically secure Base62 short code.
 */
export function generateShortCode(
  length = DEFAULT_CODE_LENGTH
): string {
  if (!Number.isInteger(length) || length < 1 || length > 16) {
    throw new Error("Short-code length must be between 1 and 16");
  }

  let code = "";

  for (let i = 0; i < length; i++) {
    const index = randomInt(0, BASE62_CHARACTERS.length);
    code += BASE62_CHARACTERS[index];
  }

  return code;
}
