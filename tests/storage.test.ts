import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import { createFileStorage } from "@/lib/storage";
import type { NewsItem } from "@/types/news";

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
});
