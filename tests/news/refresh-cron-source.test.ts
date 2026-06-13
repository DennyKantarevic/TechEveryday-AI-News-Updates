import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("Vercel refresh cron wiring", () => {
  it("uses plain GET cron paths for both daylight-saving UTC hours", () => {
    const config = JSON.parse(source("vercel.json")) as {
      crons: Array<{ path: string; schedule: string }>;
    };

    expect(config.crons).toEqual(
      expect.arrayContaining([
        { path: "/api/cron/refresh-news", schedule: "0 11 * * *" },
        { path: "/api/cron/refresh-news", schedule: "0 12 * * *" }
      ])
    );
  });

  it("exposes a GET cron route with force mode, idempotency, and revalidation", () => {
    const route = source("app/api/cron/refresh-news/route.ts");

    expect(route).toContain("export async function GET");
    expect(route).toContain("force");
    expect(route).toContain("getRefreshCronDecision");
    expect(route).toContain("revalidatePath(\"/\")");
    expect(route).toContain("vercel-cron/1.0");
  });

  it("exposes a safe refresh status endpoint", () => {
    const route = source("app/api/news/refresh-status/route.ts");

    expect(route).toContain("export async function GET");
    expect(route).toContain("lastRefreshStartedAt");
    expect(route).toContain("lastRefreshCompletedAt");
    expect(route).toContain("lastRefreshDateAmericaNewYork");
    expect(route).toContain("configuredCronSchedules");
  });
});
