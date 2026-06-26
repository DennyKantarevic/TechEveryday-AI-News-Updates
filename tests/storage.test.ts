import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import { createFileStorage } from "@/lib/storage";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

let tempDir: string | undefined;

const item: NewsItem = {
  id: "stored-item",
  title: "Stored item",
  summary: "Saved summary.",
  url: "https://example.com/stored",
  sourceName: "Example",
  sourceType: "official",
  category: "developer-tools-open-source",
  publishedAt: "2026-06-11T08:00:00.000Z",
  foundAt: "2026-06-11T09:00:00.000Z",
  imageUrl: "data:image/svg+xml,placeholder",
  trustScore: 0.9,
  saved: false,
  tags: ["tools"]
};

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = undefined;
  }
});

describe("createFileStorage", () => {
  it("persists gallery saves and removals", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "techeveryday-"));
    const storage = createFileStorage(tempDir);

    await storage.saveGalleryItem(item);
    expect(await storage.readGallery()).toMatchObject([{ id: "stored-item", saved: true }]);

    await storage.removeGalleryItem("stored-item");
    expect(await storage.readGallery()).toEqual([]);
  });

  it("filters commercial items from an existing daily snapshot", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "techeveryday-"));
    const storage = createFileStorage(tempDir);
    const categories = createCategoryRecord(() => [] as NewsItem[]);
    categories["developer-tools-open-source"] = [
      item,
      {
        ...item,
        id: "prime-day-deal",
        title: "Best Prime Day laptop deals under $500",
        summary: "Save 40% on laptops during Amazon Prime Day.",
        url: "https://consumer.example/deals/prime-day-laptops"
      }
    ];

    await storage.writeDailyNews({
      refreshedAt: "2026-06-24T12:00:00.000Z",
      timezone: "America/New_York",
      categories
    });

    const dailyNews = await storage.readDailyNews();

    expect(
      dailyNews.categories["developer-tools-open-source"].map((newsItem) => newsItem.id)
    ).toEqual(["stored-item"]);
  });

  it("persists, lists, and intentionally replaces dated archive snapshots", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "techeveryday-"));
    const storage = createFileStorage(tempDir);
    const categories = createCategoryRecord(() => [] as NewsItem[]);
    categories["developer-tools-open-source"] = [item];
    const dailyNews: DailyNews = {
      refreshedAt: "2026-06-25T11:00:00.000Z",
      timezone: "America/New_York",
      categories
    };
    const lastRefresh: LastRefresh = {
      refreshedAt: dailyNews.refreshedAt,
      nextRefreshAt: "2026-06-26T11:00:00.000Z",
      candidateCount: 10,
      categoryCounts: createCategoryRecord(
        (categoryId) => dailyNews.categories[categoryId].length
      ),
      status: "success"
    };

    await storage.writeArchiveSnapshot("2026-06-24", dailyNews, lastRefresh);
    await storage.writeArchiveSnapshot("2026-06-25", dailyNews, lastRefresh);

    const replacement = {
      ...dailyNews,
      categories: {
        ...dailyNews.categories,
        "developer-tools-open-source": [
          {
            ...item,
            id: "replacement",
            title: "Replacement archive item",
            whyItMatters: "Stored archive reasoning must remain unchanged."
          }
        ]
      }
    };
    await storage.writeArchiveSnapshot("2026-06-25", replacement, {
      ...lastRefresh,
      candidateCount: 11
    });

    expect((await storage.readArchiveSnapshot("2026-06-25"))?.dailyNews).toEqual(
      replacement
    );
    expect((await storage.readArchiveSnapshot("2026-06-24"))?.dailyNews).toEqual(
      dailyNews
    );
    expect((await storage.listArchiveSnapshots()).map((snapshot) => snapshot.date)).toEqual([
      "2026-06-25",
      "2026-06-24"
    ]);
    expect((await storage.listArchiveSnapshots())[0]).toMatchObject({
      itemCount: 1,
      sectionCounts: {
        "developer-tools-open-source": 1
      }
    });
  });

  it("exposes the current snapshot when a dated archive has not been backfilled", async () => {
    tempDir = await mkdtemp(join(tmpdir(), "techeveryday-"));
    const storage = createFileStorage(tempDir);
    const categories = createCategoryRecord(() => [] as NewsItem[]);
    categories["developer-tools-open-source"] = [item];
    const dailyNews: DailyNews = {
      refreshedAt: "2026-06-23T11:00:00.000Z",
      timezone: "America/New_York",
      categories
    };
    const lastRefresh: LastRefresh = {
      refreshedAt: dailyNews.refreshedAt,
      nextRefreshAt: "2026-06-24T11:00:00.000Z",
      lastRefreshDateAmericaNewYork: "2026-06-23",
      candidateCount: 1,
      categoryCounts: createCategoryRecord(
        (categoryId) => dailyNews.categories[categoryId].length
      ),
      status: "success"
    };

    await storage.writeDailyNews(dailyNews);
    await storage.writeLastRefresh(lastRefresh);

    expect((await storage.listArchiveSnapshots()).map((summary) => summary.date)).toEqual([
      "2026-06-23"
    ]);
    expect((await storage.readArchiveSnapshot("2026-06-23"))?.dailyNews).toMatchObject({
      refreshedAt: dailyNews.refreshedAt
    });
  });
});
