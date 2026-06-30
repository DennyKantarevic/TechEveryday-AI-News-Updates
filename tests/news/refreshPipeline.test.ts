import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import { refreshNews } from "@/lib/news/refreshPipeline";
import type { CategoryId } from "@/config/categories";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

const fetchSourceCandidatesMock = vi.hoisted(() => vi.fn());
const fetchCategoryFallbackCandidatesMock = vi.hoisted(() => vi.fn());
const fetchArxivPapersMock = vi.hoisted(() => vi.fn());
const fetchGithubRepositoriesMock = vi.hoisted(() => vi.fn());
const fetchNewsApiCandidatesMock = vi.hoisted(() => vi.fn());
const fetchTrustedXPostsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/news/fetchSources", () => ({
  fetchCategoryFallbackCandidates: fetchCategoryFallbackCandidatesMock,
  fetchSourceCandidates: fetchSourceCandidatesMock
}));

vi.mock("@/lib/news/fetchArxiv", () => ({
  fetchArxivPapers: fetchArxivPapersMock
}));

vi.mock("@/lib/news/fetchGithubRepos", () => ({
  fetchGithubRepositories: fetchGithubRepositoriesMock
}));

vi.mock("@/lib/news/fetchNewsApi", () => ({
  fetchNewsApiCandidates: fetchNewsApiCandidatesMock
}));

vi.mock("@/lib/news/fetchX", () => ({
  fetchTrustedXPosts: fetchTrustedXPostsMock
}));

const now = new Date("2026-06-12T12:00:00.000Z");
const minimumItemsPerSection = 4;
const requiredSectionIds = [
  "ai-ml",
  "automation-agentic-systems",
  "embedded-systems",
  "computer-systems",
  "developer-tools-open-source",
  "cloud-infrastructure"
] as const satisfies readonly CategoryId[];

const sectionTitles = {
  "ai-ml": [
    "AI inference pipeline architecture benchmark",
    "Machine learning training dataset evaluation",
    "Multimodal model observability implementation",
    "Neural network compiler optimization analysis"
  ],
  "automation-agentic-systems": [
    "Agent workflow orchestration reliability analysis",
    "Autonomous tool use runtime benchmark",
    "Copilot automation scheduler implementation",
    "Agentic planning evaluation case study"
  ],
  "embedded-systems": [
    "Firmware sensor timing benchmark",
    "Microcontroller power memory architecture",
    "Edge device robotics control implementation",
    "Semiconductor driver hardware interface analysis"
  ],
  "computer-systems": [
    "Kernel memory scheduler benchmark",
    "Compiler runtime storage architecture",
    "Distributed system database replication analysis",
    "Operating system tracing implementation"
  ],
  "developer-tools-open-source": [
    "Open source TypeScript framework migration guide",
    "CLI SDK developer tooling architecture",
    "GitHub repository API workflow benchmark",
    "JavaScript runtime open source implementation"
  ],
  "cloud-infrastructure": [
    "Kubernetes observability reliability architecture",
    "Serverless edge network latency benchmark",
    "AWS platform operations migration guide",
    "Cloud infrastructure storage tracing implementation"
  ]
} satisfies Record<(typeof requiredSectionIds)[number], string[]>;

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

function sectionItem(category: (typeof requiredSectionIds)[number], index: number): NewsItem {
  const title = sectionTitles[category][index - 1];

  return item({
    id: `${category}-${index}`,
    title,
    category,
    url: `https://example.com/${category}/${index}`,
    canonicalUrl: `https://example.com/${category}/${index}`,
    sourceName: `Example ${category} ${index}`,
    summary: `${title}. A technical educational engineering writeup with architecture, benchmarks, implementation detail, production tradeoffs, and reproducible lessons.`,
    tags: [category, "architecture", "benchmark", "implementation"]
  });
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
    fetchCategoryFallbackCandidatesMock.mockReset();
    fetchArxivPapersMock.mockReset();
    fetchGithubRepositoriesMock.mockReset();
    fetchNewsApiCandidatesMock.mockReset();
    fetchTrustedXPostsMock.mockReset();
    fetchCategoryFallbackCandidatesMock.mockResolvedValue([]);
    fetchGithubRepositoriesMock.mockResolvedValue([]);
    fetchNewsApiCandidatesMock.mockResolvedValue([]);
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
        id: "prime-day-deal",
        title: "Best Prime Day laptop deals under $500",
        summary: "Save 40% on laptops with a limited-time affiliate offer.",
        url: "https://consumer.example/deals/prime-day-laptops",
        canonicalUrl: "https://consumer.example/deals/prime-day-laptops",
        sourceName: "Consumer Tech",
        sourceType: "news",
        tags: ["shopping", "deal", "affiliate"]
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
    expect(result.debug.rejectedBySalesPromotion).toBe(1);
    expect(result.debug.rejectedByLowQuality).toBe(2);
    expect(result.debug.rejectedByDuplicate).toBe(1);
    expect(result.debug.rejectedAsConsumerFiller).toBe(2);
    expect(result.debug.sourceTypeCounts).toEqual({ article: 5, paper: 0, repo: 0 });
    expect(result.debug.finalSelectedByCategory["cloud-infrastructure"]).toBe(1);
    expect(result.debug.sourcesUsed).toContain("Example Engineering");
    expect(writtenLastRefresh?.debug?.rejectedByAge).toBe(1);
    expect(writtenLastRefresh?.debug?.rejectedBySalesPromotion).toBe(1);
  });

  it("runs fallback discovery for sections with fewer than four selected items", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloudflare runtime architecture benchmark"
      }),
      item({
        id: "cloud-2",
        title: "AWS observability architecture guide",
        sourceName: "AWS Blog"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? [
            item({
              id: "cloud-3",
              title: "Kubernetes platform reliability engineering writeup",
              sourceName: "Kubernetes Blog"
            }),
            item({
              id: "cloud-4",
              title: "Serverless edge platform latency benchmark",
              sourceName: "Fastly Engineering"
            })
          ]
        : []
    );

    let writtenLastRefresh: LastRefresh | undefined;
    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn(async (lastRefresh: LastRefresh) => {
        writtenLastRefresh = lastRefresh;
      })
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(fetchCategoryFallbackCandidatesMock).toHaveBeenCalledWith({
      categoryId: "cloud-infrastructure",
      now
    });
    expect(result.dailyNews.categories["cloud-infrastructure"].map((news) => news.id)).toEqual(
      expect.arrayContaining(["cloud-1", "cloud-2", "cloud-3", "cloud-4"])
    );
    expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(4);
    expect(result.debug.fallbackCandidateCount).toBe(2);
    expect(result.debug.underfilledCategories["cloud-infrastructure"]).toBeUndefined();
    expect(writtenLastRefresh?.debug?.fallbackCandidateCount).toBe(2);
  });

  it("uses fallback candidates so every required section reaches at least four items when enough valid candidates exist", async () => {
    fetchSourceCandidatesMock.mockResolvedValue(
      requiredSectionIds.flatMap((categoryId) =>
        [1, 2, 3].map((index) => sectionItem(categoryId, index))
      )
    );
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      requiredSectionIds.includes(categoryId)
        ? [sectionItem(categoryId, minimumItemsPerSection)]
        : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    for (const categoryId of requiredSectionIds) {
      expect(fetchCategoryFallbackCandidatesMock).toHaveBeenCalledWith({
        categoryId,
        now
      });
      expect(result.dailyNews.categories[categoryId]).toHaveLength(minimumItemsPerSection);
      expect(result.debug.finalSelectedByCategory[categoryId]).toBeGreaterThanOrEqual(
        minimumItemsPerSection
      );
      expect(result.debug.underfilledCategories[categoryId]).toBeUndefined();
    }
  });

  it("includes repository candidates in selection diagnostics and source breakdown", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchGithubRepositoriesMock.mockResolvedValue([
      item({
        id: "repo-runtime",
        title: "systems-lab/runtime-tracer",
        sourceName: "GitHub",
        sourceType: "repo",
        category: "developer-tools-open-source",
        summary:
          "Repository: systems-lab/runtime-tracer. Description: open source runtime tracing with scheduler instrumentation. Language: Rust. Stars: 2840. Last updated: 2026-06-12. README: benchmark setup, p99 latency analysis, architecture diagrams, and production debugging workflows.",
        tags: ["github", "repository", "rust", "runtime", "tracing"]
      })
    ]);

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.dailyNews.categories["developer-tools-open-source"].map((news) => news.id)).toEqual([
      "repo-runtime"
    ]);
    expect(result.sourceBreakdown.repos).toBe(1);
    expect(result.debug.sourceTypeCounts).toEqual({ article: 0, paper: 0, repo: 1 });
  });

  it("logs sections that remain underfilled after fallback discovery", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "embedded-1",
        title: "Embedded firmware architecture benchmark",
        category: "embedded-systems",
        tags: ["embedded", "firmware", "benchmark"]
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockResolvedValue([]);

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.debug.underfilledCategories["embedded-systems"]).toEqual({
      attemptedFallback: true,
      selectedCount: 1,
      targetCount: minimumItemsPerSection,
      reasons: ["not enough fresh candidates"],
      message:
        "Only 1 high-signal fresh item found after fallback discovery; showing the best available fresh items. Reason: not enough fresh candidates."
    });
  });
});
