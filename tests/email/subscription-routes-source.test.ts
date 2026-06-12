import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function routeSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("email subscription route security", () => {
  it("hashes confirmation and unsubscribe tokens before storage", () => {
    const source = routeSource("app/api/email/subscribe/route.ts");

    expect(source).toContain("hashToken(confirmationToken)");
    expect(source).toContain("hashToken(unsubscribeToken)");
    expect(source).toContain("confirmation_token_hash");
    expect(source).toContain("unsubscribe_token_hash");
  });

  it("allows unsubscribe without requiring login", () => {
    const source = routeSource("app/api/email/unsubscribe/route.ts");

    expect(source).toContain("createAdminSupabaseClient");
    expect(source).not.toContain("getCurrentUser");
  });
});
