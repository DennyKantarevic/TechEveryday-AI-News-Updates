import { afterEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import type { DailyNews, LastRefresh } from "@/types/news";

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

async function importSnapshotStorageWithEmptySupabaseRow() {
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
            maybeSingle: async () => ({ data: null, error: null })
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

    const { newsSnapshotStorage } = await importSnapshotStorageWithEmptySupabaseRow();
    const dailyNews = await newsSnapshotStorage.readDailyNews();
    const lastRefresh = await newsSnapshotStorage.readLastRefresh();

    expect(dailyNews.refreshedAt).toBe("1970-01-01T00:00:00.000Z");
    expect(lastRefresh.status).toBe("error");
    expect(lastRefresh.message).toMatch(/No Supabase newsletter snapshot exists/i);
  });
});
