import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleRefreshRequest } from "@/lib/news/refreshHandler";

vi.mock("@/lib/news/snapshotStorage", () => ({
  newsSnapshotStorage: {
    readLastRefresh: vi.fn(async () => ({})),
    writeLastRefresh: vi.fn()
  },
  snapshotStorageStatus: vi.fn(() => ({
    persistentStorageConfigured: false,
    storageBackend: "local-json"
  }))
}));

vi.mock("@/lib/news/refreshPipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/news/refreshPipeline")>();

  return {
    ...actual,
    refreshNews: vi.fn()
  };
});

describe("refresh request handler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T14:30:00.000Z"));
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("skips off-hour Vercel cron requests before requiring persistent storage", async () => {
    const request = new NextRequest(
      "https://tech-everyday-ai-news-updates.vercel.app/api/cron/refresh-news",
      {
        headers: {
          "user-agent": "vercel-cron/1.0"
        }
      }
    );

    const response = await handleRefreshRequest(request, {
      scheduled: true,
      allowVercelCron: true,
      revalidate: vi.fn()
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      skipped: true,
      reason: "Not 7AM America/New_York"
    });
  });
});
