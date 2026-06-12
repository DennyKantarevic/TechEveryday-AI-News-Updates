import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import { refreshNews } from "@/lib/news/refreshPipeline";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

const fetchSourceCandidatesMock = vi.hoisted(() => vi.fn());
const fetchArxivPapersMock = vi.hoisted(() => vi.fn());
const fetchTrustedXPostsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/news/fetchSources", () => ({
  fetchSourceCandidates: fetchSourceCandidatesMock
}));

vi.mock("@/lib/news/fetchArxiv", () => ({
  fetchArxivPapers: fetchArxivPapersMock
}));

vi.mock("@/lib/news/fetchX", () => ({
  fetchTrustedXPosts: fetchTrustedXPostsMock
}));

const now = new Date("2026-06-12T12:00:00.000Z");

function item(overrides: Partial<NewsItem> & Pick<NewsItem, "id" | "title">): NewsItem {
  return {
    summary:
      "A technical engineering writeup with architecture, benchmarks, implementation, and production details.",
    url: `https://example.com/${overrides.id}`,
    canonicalUrl: `https://example.com/${overrides.id}`,
    sourceName: "Example Engineering",
    sourceType: "official",
    category: "cloud-infrastructure",
    publishedAt: "2026-06-12T08:00:00.000Z",
    foundAt: now.toISOString(),
    imageUrl: "data:image/svg+xml,placeholder",
    trustScore: 0.9,
    freshnessScore: 4,
    technicalDepthScore: 4,
    educationalScore: 4,
    practicalUsefulnessScore: 4,
    noveltyScore: 0,
    finalScore: 4.4,
    saved: false,
    tags: ["architecture", "production"],
    keyClaims: ["The system architecture changed."],
    whyItMatters: "It helps practitioners understand a current engineering change.",
    ...overrides
  };
}

function emptyDailyNews(): DailyNews {
  return {
    refreshedAt: "2026-06-11T12:00:00.000Z",
    timezone: "America/New_York",
    categories: createCategoryRecord(() => [])
  };
}

describe("refreshNews diagnostics", () => {
  beforeEach(() => {
    fetchSourceCandidatesMock.mockReset();
    fetchArxivPapersMock.mockReset();
    fetchTrustedXPostsMock.mockReset();
  });

  it("writes debug counts for age, quality, duplicate, and final category selection", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "stale",
        title: "Old cloud architecture benchmark",
        publishedAt: "2026-06-08T08:00:00.000Z"
      }),
      item({
        id: "low-quality",
        title: "Celebrity prank app goes viral after fake podcast drama",
        summary: "A viral entertainment-only story with creator outrage and no technical depth.",
        category: "developer-tools-open-source",
        sourceType: "news",
        trustScore: 0.78,
        tags: ["viral", "drama", "fake podcast"]
      }),
      item({
        id: "accepted",
        title: "Cloudflare explains Workers runtime observability architecture"
      }),
      item({
        id: "duplicate",
        title: "Cloudflare explains Workers runtime observability architecture",
        url: "https://duplicate.example.com/runtime-observability",
        canonicalUrl: "https://duplicate.example.com/runtime-observability"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);

    let writtenDailyNews: DailyNews | undefined;
    let writtenLastRefresh: LastRefresh | undefined;
    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(async (dailyNews: DailyNews) => {
        writtenDailyNews = dailyNews;
      }),
      writeLastRefresh: vi.fn(async (lastRefresh: LastRefresh) => {
        writtenLastRefresh = lastRefresh;
      })
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(writtenDailyNews?.categories["cloud-infrastructure"].map((news) => news.id)).toEqual([
      "accepted"
    ]);
    expect(result.debug.rejectedByAge).toBe(1);
    expect(result.debug.rejectedByLowQuality).toBe(1);
    expect(result.debug.rejectedByDuplicate).toBe(1);
    expect(result.debug.finalSelectedByCategory["cloud-infrastructure"]).toBe(1);
    expect(result.debug.sourcesUsed).toContain("Example Engineering");
    expect(writtenLastRefresh?.debug?.rejectedByAge).toBe(1);
  });
});
