import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  join(process.cwd(), "app/api/cron/send-daily-emails/route.ts"),
  "utf8"
);

describe("daily email cron route", () => {
  it("requires cron secret and confirmed subscriptions", () => {
    expect(source).toContain("CRON_SECRET");
    expect(source).toContain("subscribed");
    expect(source).toContain("confirmed_at");
    expect(source).toContain("Authorization");
  });

  it("generates unsubscribe tokens per send and logs delivery", () => {
    expect(source).toContain("createSecureToken()");
    expect(source).toContain("hashToken(unsubscribeToken)");
    expect(source).toContain("email_delivery_logs");
    expect(source).toContain("process.env.APP_BASE_URL!");
    expect(source).toContain("from: process.env.EMAIL_FROM!");
  });
});
