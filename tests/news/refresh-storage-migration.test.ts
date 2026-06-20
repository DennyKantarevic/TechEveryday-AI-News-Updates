import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("persistent refresh storage migration", () => {
  it("creates newsletter snapshots and refresh run observability tables", () => {
    const migration = source("supabase/migrations/202606190001_refresh_observability.sql");

    expect(migration).toContain("create table if not exists public.newsletter_snapshots");
    expect(migration).toContain("create table if not exists public.refresh_runs");
    expect(migration).toContain("daily_news jsonb not null");
    expect(migration).toContain("failed_sources jsonb not null default '[]'::jsonb");
    expect(migration).toContain("last_refresh_date_america_new_york text");
  });

  it("keeps refresh storage service-role managed", () => {
    const migration = source("supabase/migrations/202606190001_refresh_observability.sql");

    expect(migration).toContain("alter table public.newsletter_snapshots enable row level security");
    expect(migration).toContain("alter table public.refresh_runs enable row level security");
    expect(migration).toContain("to service_role");
    expect(migration).not.toContain("to anon");
  });
});
