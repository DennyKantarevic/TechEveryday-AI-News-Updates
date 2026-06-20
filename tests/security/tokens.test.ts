import { describe, expect, it } from "vitest";
import { hashToken } from "@/lib/security/hash";
import { createSecureToken } from "@/lib/security/tokens";

describe("email tokens", () => {
  it("generates random tokens and stable hashes without exposing raw values as hashes", () => {
    const one = createSecureToken();
    const two = createSecureToken();
    const oneHash = hashToken(one);

    expect(one).not.toBe(two);
    expect(one.length).toBeGreaterThan(30);
    expect(oneHash).not.toBe(one);
    expect(hashToken(one)).toBe(oneHash);
  });
});
