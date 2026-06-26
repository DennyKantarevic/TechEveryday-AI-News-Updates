import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import { handleRefreshRequest } from "@/lib/news/refreshHandler";
import { refreshNews } from "@/lib/news/refreshPipeline";
import {
  newsSnapshotStorage,
  snapshotStorageStatus
} from "@/lib/news/snapshotStorage";

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
    vi.mocked(newsSnapshotStorage.readLastRefresh).mockResolvedValue({} as never);
    vi.mocked(newsSnapshotStorage.writeLastRefresh).mockResolvedValue();
    vi.mocked(snapshotStorageStatus).mockReturnValue({
      persistentStorageConfigured: false,
      storageBackend: "local-json",
      missingEnvVars: []
    });
    vi.mocked(refreshNews).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("skips off-hour Vercel cron requests before requiring persistent storage", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const request = new NextRequest(
      "https://tech-everyday-ai-news-updates.vercel.app/api/cron/refresh-news",
      {
        headers: {
          authorization: "Bearer test-cron-secret",
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

  it("does not trust Vercel cron user-agent without the bearer cron secret", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
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

    expect(response.status).toBe(401);
    expect(body).toMatchObject({
      error: "Unauthorized refresh request."
    });
  });

  it("returns a clear production config error when CRON_SECRET is missing", async () => {
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

    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      status: "error",
      message: "Missing CRON_SECRET. Add it to Vercel Production environment variables."
    });
  });

  it("requires bearer auth for manual force refresh and ignores query secrets", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const request = new NextRequest(
      "https://tech-everyday-ai-news-updates.vercel.app/api/cron/refresh-news?force=true&secret=test-cron-secret"
    );

    const response = await handleRefreshRequest(request, {
      scheduled: false,
      allowVercelCron: true,
      revalidate: vi.fn()
    });

    expect(response.status).toBe(401);
  });

  it("revalidates the Calendar page after a successful refresh", async () => {
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    vi.mocked(snapshotStorageStatus).mockReturnValue({
      persistentStorageConfigured: true,
      storageBackend: "supabase",
      missingEnvVars: []
    });
    const dailyNews = {
      refreshedAt: "2026-06-13T14:30:00.000Z",
      timezone: "America/New_York" as const,
      categories: createCategoryRecord(() => [])
    };
    vi.mocked(refreshNews).mockResolvedValue({
      dailyNews,
      candidateCount: 0,
      failedSources: [],
      sourceBreakdown: {
        rss: 0,
        arxiv: 0,
        repos: 0,
        newsApi: 0,
        x: 0
      },
      debug: {} as never
    });
    const revalidate = vi.fn();
    const request = new NextRequest(
      "https://tech-everyday-ai-news-updates.vercel.app/api/refresh-news?force=true",
      {
        headers: {
          authorization: "Bearer test-cron-secret"
        }
      }
    );

    const response = await handleRefreshRequest(request, {
      scheduled: false,
      allowVercelCron: false,
      revalidate
    });

    expect(response.status).toBe(200);
    expect(revalidate).toHaveBeenCalledWith("/calendar");
  });
});
