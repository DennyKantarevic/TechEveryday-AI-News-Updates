import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function routeSource(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("email subscription route security", () => {
  it("hashes confirmation and unsubscribe tokens before storage", () => {
    const source = routeSource("app/api/email/subscribe/route.ts");

    expect(source).toContain("z.string().trim().email()");
    expect(source).toContain("hashToken(confirmationToken)");
    expect(source).toContain("hashToken(unsubscribeToken)");
    expect(source).toContain("confirmation_token_hash");
    expect(source).toContain("unsubscribe_token_hash");
    expect(source).toContain("readEmailConfig(process.env)");
    expect(source).toContain("safeEmailConfigDiagnostics(process.env)");
    expect(source).toContain("process.env.APP_BASE_URL!");
    expect(source).toContain("from: process.env.EMAIL_FROM!");
    expect(source).toContain("result.error");
    expect(source).toContain("Email provider rejected the confirmation email.");
    expect(source).toContain("Confirm your TechEveryday subscription");
    expect(source).toContain("Confirm your subscription to daily TechEveryday updates.");
    expect(source).toContain("If you did not request this, you can ignore this email.");
    expect(source).toContain("Check your email to confirm your TechEveryday subscription.");
  });

  it("allows unsubscribe without requiring login", () => {
    const source = routeSource("app/api/email/unsubscribe/route.ts");

    expect(source).toContain("createAdminSupabaseClient");
    expect(source).not.toContain("getCurrentUser");
  });

  it("protects the email diagnostics endpoint outside development", () => {
    const source = routeSource("app/api/email/debug-config/route.ts");

    expect(source).toContain("safeEmailConfigDiagnostics(process.env)");
    expect(source).toContain("process.env.NODE_ENV !== \"production\"");
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain("Unauthorized.");
  });
});
