import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import type { LastRefresh } from "@/types/news";

const refreshNewsMock = vi.hoisted(() => vi.fn());
const fileStorageMock = vi.hoisted(() => ({
  readLastRefresh: vi.fn(),
  writeDailyNews: vi.fn(),
  writeLastRefresh: vi.fn()
}));

vi.mock("@/lib/news/refreshPipeline", () => ({
  emptyCategoryCounts: () => createCategoryRecord(() => 0),
  refreshNews: refreshNewsMock
}));

vi.mock("@/lib/storage", () => ({
  fileStorage: fileStorageMock
}));

describe("refresh status route", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", "test-secret");
    refreshNewsMock.mockReset();
    fileStorageMock.readLastRefresh.mockReset();
    fileStorageMock.writeDailyNews.mockReset();
    fileStorageMock.writeLastRefresh.mockReset();
  });

  it("leaves the latest snapshot unchanged when refresh fails", async () => {
    const previousStatus: LastRefresh = {
      refreshedAt: "2026-06-11T12:00:00.000Z",
      nextRefreshAt: "2026-06-12T11:00:00.000Z",
      candidateCount: 24,
      categoryCounts: createCategoryRecord((categoryId) =>
        categoryId === "ai-ml" ? 4 : 0
      ),
      status: "success",
      message: "Refresh completed with fresh high-signal items."
    };
    fileStorageMock.readLastRefresh.mockResolvedValue(previousStatus);
    refreshNewsMock.mockRejectedValue(new Error("source fetch failed"));

    const { POST } = await import("@/app/api/refresh-news/route");
    const response = await POST(
      new NextRequest("http://localhost/api/refresh-news", {
        method: "POST",
        headers: {
          authorization: "Bearer test-secret"
        }
      })
    );

    expect(response.status).toBe(500);
    expect(fileStorageMock.writeDailyNews).not.toHaveBeenCalled();
    expect(fileStorageMock.writeLastRefresh).toHaveBeenCalledWith(
      expect.objectContaining({
        refreshedAt: previousStatus.refreshedAt,
        categoryCounts: previousStatus.categoryCounts,
        status: "error",
        message: "source fetch failed"
      })
    );
  });
});
