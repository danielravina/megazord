import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isValidEmail } from "./validate-email";

describe("isValidEmail", () => {
  it("accepts a valid email", () => {
    assert.equal(isValidEmail("daniel@gmail.com"), true);
    assert.equal(isValidEmail("a.b@sub.domain.co.il"), true);
  });

  it("rejects missing @ or domain", () => {
    assert.equal(isValidEmail("no-at-sign.com"), false);
    assert.equal(isValidEmail("a@nodot"), false);
    assert.equal(isValidEmail("a@.com"), false);
  });

  it("rejects empty and whitespace", () => {
    assert.equal(isValidEmail(""), false);
    assert.equal(isValidEmail("   "), false);
    assert.equal(isValidEmail(null as unknown as string), false);
  });

  it("rejects spaces inside", () => {
    assert.equal(isValidEmail("a b@gmail.com"), false);
    assert.equal(isValidEmail("ab@gmail .com"), false);
  });
});
