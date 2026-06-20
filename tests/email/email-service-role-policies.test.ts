import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/202606190003_email_service_role_policies.sql"),
  "utf8"
);

describe("email service role policies", () => {
  it("allows server-only service role email sending without public email access", () => {
    expect(migration).toContain("on public.newsletter_subscriptions for all");
    expect(migration).toContain("on public.email_delivery_logs for all");
    expect(migration).toMatch(/to service_role/g);
    expect(migration).not.toContain("to anon");
  });
});
