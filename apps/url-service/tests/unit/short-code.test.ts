
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { generateShortCode } from "../../src/utils/short-code";

describe("generateShortCode", () => {
  it("generates a 10-character code by default", () => {
    const code = generateShortCode();

    assert.equal(code.length, 10);
  });

  it("generates only Base62 characters", () => {
    const code = generateShortCode();

    assert.match(code, /^[0-9A-Za-z]+$/);
  });

  it("supports a custom code length", () => {
    const code = generateShortCode(8);

    assert.equal(code.length, 8);
  });

  it("rejects invalid lengths", () => {
    assert.throws(() => generateShortCode(0));
    assert.throws(() => generateShortCode(17));
    assert.throws(() => generateShortCode(2.5));
  });

  it("generates different codes across repeated calls", () => {
    const codes = new Set(
      Array.from({ length: 1000 }, () => generateShortCode())
    );

    assert.equal(codes.size, 1000);
  });
});
