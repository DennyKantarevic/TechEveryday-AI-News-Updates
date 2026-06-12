import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = join(
  process.cwd(),
  "supabase/migrations/202606120001_auth_user_data.sql"
);
const migration = readFileSync(migrationPath, "utf8");

describe("Supabase auth data migration", () => {
  it("creates every account-owned table", () => {
    for (const table of [
      "profiles",
      "user_preferences",
      "saved_articles",
      "reading_events",
      "newsletter_subscriptions",
      "email_delivery_logs"
    ]) {
      expect(migration).toContain(`create table if not exists public.${table}`);
    }
  });

  it("enables RLS on every user-owned table", () => {
    for (const table of [
      "profiles",
      "user_preferences",
      "saved_articles",
      "reading_events",
      "newsletter_subscriptions",
      "email_delivery_logs"
    ]) {
      expect(migration).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("uses auth.uid policies for user-owned rows", () => {
    expect(migration).toMatch(/auth\.uid\(\) is not null and auth\.uid\(\) = user_id/g);
    expect(migration).toContain("Users can manage own saved articles");
    expect(migration).toContain("Users can manage own reading events");
    expect(migration).toContain("Users can view own subscription");
    expect(migration).not.toContain("anon");
  });

  it("creates profile and preference rows when auth users are created", () => {
    expect(migration).toContain("handle_new_auth_user");
    expect(migration).toContain("after insert on auth.users");
    expect(migration).toContain("insert into public.profiles");
    expect(migration).toContain("insert into public.user_preferences");
  });
});
