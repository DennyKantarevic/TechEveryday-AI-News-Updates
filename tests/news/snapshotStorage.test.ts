import { afterEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

const localDailyNews: DailyNews = {
  refreshedAt: "2026-06-01T00:00:00.000Z",
  timezone: "America/New_York",
  categories: createCategoryRecord(() => [])
};

const localLastRefresh: LastRefresh = {
  refreshedAt: "2026-06-01T00:00:00.000Z",
  nextRefreshAt: "2026-06-02T11:00:00.000Z",
  status: "success",
  message: "Local JSON artifact",
  itemsFound: 12,
  itemsSelected: 12,
  errors: []
};

async function importSnapshotStorageWithSupabaseRow(dailyNews: DailyNews | null = null) {
  vi.resetModules();
  vi.doMock("@/lib/storage", () => ({
    fileStorage: {
      readDailyNews: vi.fn(async () => localDailyNews),
      writeDailyNews: vi.fn(),
      readLastRefresh: vi.fn(async () => localLastRefresh),
      writeLastRefresh: vi.fn()
    }
  }));
  vi.doMock("@/lib/supabase/admin", () => ({
    createAdminSupabaseClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: dailyNews
                ? {
                    id: "current",
                    daily_news: dailyNews,
                    last_refresh: null
                  }
                : null,
              error: null
            })
          })
        })
      })
    })
  }));

  return import("@/lib/news/snapshotStorage");
}

describe("news snapshot storage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does not fall back to local JSON reads in production when Supabase has no snapshot", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    const { newsSnapshotStorage } = await importSnapshotStorageWithSupabaseRow();
    const dailyNews = await newsSnapshotStorage.readDailyNews();
    const lastRefresh = await newsSnapshotStorage.readLastRefresh();

    expect(dailyNews.refreshedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(lastRefresh.status).toBe("error");
    expect(lastRefresh.message).toMatch(/No Supabase newsletter snapshot exists/i);
  });

  it("filters commercial items from an existing Supabase snapshot", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");

    const technicalItem: NewsItem = {
      id: "technical-item",
      title: "Cloudflare explains routing incident mitigation",
      summary:
        "An engineering writeup with routing architecture, incident analysis, and implementation details.",
      url: "https://blog.cloudflare.com/routing-incident/",
      canonicalUrl: "https://blog.cloudflare.com/routing-incident",
      sourceName: "Cloudflare Blog",
      sourceType: "official",
      category: "cloud-infrastructure",
      publishedAt: "2026-06-24T10:00:00.000Z",
      foundAt: "2026-06-24T10:00:00.000Z",
      trustScore: 0.9,
      freshnessScore: 4,
      technicalDepthScore: 4,
      educationalScore: 4,
      practicalUsefulnessScore: 4,
      noveltyScore: 0,
      finalScore: 4.5,
      saved: false,
      tags: ["routing", "architecture"],
      keyClaims: ["The incident exposed a routing constraint."],
      whyItMatters: "The writeup explains a reproducible routing mitigation."
    };
    const categories = createCategoryRecord(() => [] as NewsItem[]);
    categories["cloud-infrastructure"] = [
      technicalItem,
      {
        ...technicalItem,
        id: "prime-day-deal",
        title: "The best robot vacuum deals available during Prime Day",
        summary: "Save on robot vacuums during Amazon Prime Day.",
        url: "https://www.theverge.com/gadgets/robot-vacuum-deals",
        canonicalUrl: "https://www.theverge.com/gadgets/robot-vacuum-deals"
      }
    ];
    const { newsSnapshotStorage } = await importSnapshotStorageWithSupabaseRow({
      refreshedAt: "2026-06-24T11:17:22.927Z",
      timezone: "America/New_York",
      categories
    });

    const dailyNews = await newsSnapshotStorage.readDailyNews();

    expect(
      dailyNews.categories["cloud-infrastructure"].map((newsItem) => newsItem.id)
    ).toEqual(["technical-item"]);
  });

  it("atomically upserts current and dated rows for a successful refresh", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    const upsert = vi.fn(async () => ({ error: null }));
    const insert = vi.fn(async () => ({ error: null }));

    vi.resetModules();
    vi.doMock("@/lib/supabase/admin", () => ({
      createAdminSupabaseClient: () => ({
        from: (table: string) =>
          table === "newsletter_snapshots"
            ? { upsert }
            : { insert }
      })
    }));
    vi.doMock("@/lib/storage", () => ({
      fileStorage: {
        readDailyNews: vi.fn(async () => localDailyNews),
        writeDailyNews: vi.fn(),
        readLastRefresh: vi.fn(async () => localLastRefresh),
        writeLastRefresh: vi.fn(),
        readArchiveSnapshot: vi.fn(),
        writeArchiveSnapshot: vi.fn(),
        listArchiveSnapshots: vi.fn(async () => [])
      }
    }));
    const { newsSnapshotStorage } = await import("@/lib/news/snapshotStorage");

    await newsSnapshotStorage.writeSuccessfulSnapshot({
      date: "2026-06-25",
      dailyNews: localDailyNews,
      lastRefresh: {
        ...localLastRefresh,
        lastRefreshDateAmericaNewYork: "2026-06-25"
      }
    });

    expect(upsert).toHaveBeenCalledWith([
      expect.objectContaining({
        id: "current",
        daily_news: localDailyNews
      }),
      expect.objectContaining({
        id: "2026-06-25",
        daily_news: localDailyNews
      })
    ]);
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
