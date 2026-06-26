import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import { refreshNews } from "@/lib/news/refreshPipeline";
import type { CategoryId } from "@/config/categories";
import type { TrustedSourceConfig } from "@/config/sources";
import type { SourceFetchFailureDiagnostic } from "@/lib/news/fetchSources";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

const fetchSourceCandidatesMock = vi.hoisted(() => vi.fn());
const fetchCategoryFallbackCandidatesMock = vi.hoisted(() => vi.fn());
const fetchArxivPapersMock = vi.hoisted(() => vi.fn());
const fetchArxivCategoryCandidatesMock = vi.hoisted(() => vi.fn());
const fetchGithubRepositoriesMock = vi.hoisted(() => vi.fn());
const fetchTrustedXPostsMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/news/fetchSources", () => ({
  fetchCategoryFallbackCandidates: fetchCategoryFallbackCandidatesMock,
  fetchSourceCandidates: fetchSourceCandidatesMock
}));

vi.mock("@/lib/news/fetchArxiv", () => ({
  arxivCategoryRequestUrl: (categoryId: string) =>
    `https://export.arxiv.org/api/query?search_query=${categoryId}`,
  arxivRequestUrl: () => "https://export.arxiv.org/api/query?search_query=test",
  fetchArxivCategoryCandidates: fetchArxivCategoryCandidatesMock,
  fetchArxivPapers: fetchArxivPapersMock,
  fetchArxivPapersWithDiagnostics: async (options: unknown) => {
    const items = await fetchArxivPapersMock(options);
    return {
      items,
      diagnostics: {
        requestUrl: "https://export.arxiv.org/api/query?search_query=test",
        rawCount: items.length,
        parsedCount: items.length
      }
    };
  }
}));

vi.mock("@/lib/news/fetchGithubRepos", () => ({
  fetchGithubRepositories: fetchGithubRepositoriesMock
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

function targetedItems(items: NewsItem[] = []) {
  return { items };
}

function targetedFailure(message: string) {
  return {
    items: [],
    failure: new Error(message)
  };
}

function emptyDailyNews(): DailyNews {
  return {
    refreshedAt: "2026-06-11T12:00:00.000Z",
    timezone: "America/New_York",
    categories: createCategoryRecord(() => [])
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshNews diagnostics", () => {
  beforeEach(() => {
    fetchSourceCandidatesMock.mockReset();
    fetchCategoryFallbackCandidatesMock.mockReset();
    fetchArxivPapersMock.mockReset();
    fetchArxivCategoryCandidatesMock.mockReset();
    fetchGithubRepositoriesMock.mockReset();
    fetchTrustedXPostsMock.mockReset();
    fetchCategoryFallbackCandidatesMock.mockResolvedValue([]);
    fetchArxivCategoryCandidatesMock.mockResolvedValue(targetedItems());
    fetchGithubRepositoriesMock.mockImplementation(
      async ({ categoryIds }: { categoryIds?: readonly CategoryId[] } = {}) =>
        categoryIds ? targetedItems() : []
    );
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

  it("writes one successful current-and-dated snapshot with archive diagnostics", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "archived-cloud",
        title: "Cloud runtime architecture benchmark"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    const writeSuccessfulSnapshot = vi.fn();
    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn(),
      listArchiveSnapshots: vi.fn(async () => [
        {
          date: "2026-06-11",
          itemCount: 4,
          sectionCounts: createCategoryRecord(() => 0),
          updatedAt: "2026-06-11T12:00:00.000Z"
        }
      ]),
      writeSuccessfulSnapshot
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(writeSuccessfulSnapshot).toHaveBeenCalledWith({
      date: "2026-06-12",
      dailyNews: result.dailyNews,
      lastRefresh: expect.objectContaining({
        lastRefreshDateAmericaNewYork: "2026-06-12",
        debug: expect.objectContaining({
          archiveSnapshotDate: "2026-06-12",
          availableArchiveDatesCount: 2,
          latestSnapshotDate: "2026-06-12",
          latestHistoricalSnapshotDate: "2026-06-12"
        })
      })
    });
    expect(storage.writeDailyNews).not.toHaveBeenCalled();
    expect(storage.writeLastRefresh).not.toHaveBeenCalled();
  });

  it("runs fallback discovery for required sections with fewer than four selected items", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloudflare runtime architecture benchmark"
      }),
      item({
        id: "cloud-2",
        title: "AWS observability architecture guide",
        sourceName: "AWS Blog"
      }),
      item({
        id: "cloud-3",
        title: "Azure platform reliability implementation details",
        sourceName: "Azure Blog"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? [
            item({
              id: "cloud-4",
              title: "Kubernetes platform reliability engineering writeup",
              sourceName: "Kubernetes Blog"
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

    expect(fetchCategoryFallbackCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "cloud-infrastructure",
        now
      })
    );
    expect(result.dailyNews.categories["cloud-infrastructure"].map((news) => news.id)).toEqual(
      expect.arrayContaining(["cloud-1", "cloud-2", "cloud-3", "cloud-4"])
    );
    expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(4);
    expect(result.debug.fallbackCandidateCount).toBe(1);
    expect(result.debug.minimumMetByCategory["cloud-infrastructure"]).toBe(true);
    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]).toBeUndefined();
    expect(writtenLastRefresh?.debug?.fallbackCandidateCount).toBe(1);
  });

  it("combines category RSS, targeted arXiv, and targeted GitHub fallback candidates", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloud runtime architecture benchmark"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? [
            item({
              id: "cloud-rss",
              title: "Cloud platform reliability implementation guide",
              sourceName: "Cloud Engineering Blog"
            })
          ]
        : []
    );
    fetchArxivCategoryCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? targetedItems([
            item({
              id: "cloud-arxiv",
              title: "Serverless observability architecture evaluation",
              sourceName: "arXiv",
              sourceType: "paper"
            })
          ])
        : targetedItems()
    );
    fetchGithubRepositoriesMock.mockImplementation(
      async ({ categoryIds }: { categoryIds?: readonly CategoryId[] } = {}) =>
        categoryIds?.includes("cloud-infrastructure")
          ? targetedItems([
              item({
                id: "cloud-github",
                title: "platform-lab/cloud-observability",
                sourceName: "GitHub",
                sourceType: "repo"
              })
            ])
          : categoryIds
            ? targetedItems()
            : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(fetchCategoryFallbackCandidatesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: "cloud-infrastructure",
        now
      })
    );
    expect(fetchArxivCategoryCandidatesMock).toHaveBeenCalledWith({
      categoryId: "cloud-infrastructure",
      now
    });
    expect(fetchGithubRepositoriesMock).toHaveBeenCalledWith({
      categoryIds: ["cloud-infrastructure"],
      now
    });
    expect(result.dailyNews.categories["cloud-infrastructure"].map((news) => news.id)).toEqual(
      expect.arrayContaining(["cloud-1", "cloud-rss", "cloud-arxiv", "cloud-github"])
    );
    expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(4);
    expect(result.debug.fallbackCandidateCount).toBe(3);
    expect(result.debug.minimumMetByCategory["cloud-infrastructure"]).toBe(true);
  });

  it("filters fallback pools by requested category and re-runs freshness and quality selection", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "ai-1",
        title: "Machine learning inference architecture benchmark",
        category: "ai-ml"
      }),
      item({
        id: "ai-2",
        title: "Neural model training implementation guide",
        category: "ai-ml",
        sourceName: "ML Engineering"
      }),
      item({
        id: "ai-3",
        title: "Multimodal model evaluation details",
        category: "ai-ml",
        sourceName: "AI Research"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "ai-ml"
        ? [
            item({
              id: "wrong-category",
              title: "Kernel storage architecture benchmark",
              category: "computer-systems"
            })
          ]
        : []
    );
    fetchArxivCategoryCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "ai-ml"
        ? targetedItems([
            item({
              id: "stale-ai-paper",
              title: "Machine learning model benchmark from last week",
              category: "ai-ml",
              sourceName: "arXiv",
              sourceType: "paper",
              publishedAt: "2026-06-08T08:00:00.000Z"
            })
          ])
        : targetedItems()
    );
    fetchGithubRepositoriesMock.mockImplementation(
      async ({ categoryIds }: { categoryIds?: readonly CategoryId[] } = {}) =>
        categoryIds?.includes("ai-ml")
          ? targetedItems([
              item({
                id: "ai-repo-deal",
                title: "Best AI repository deals at 50% off",
                summary: "Shop this sponsored affiliate deal before the limited-time sale ends.",
                category: "ai-ml",
                sourceName: "GitHub",
                sourceType: "repo",
                tags: ["shopping", "deal", "affiliate"]
              })
            ])
          : categoryIds
            ? targetedItems()
            : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.debug.fallbackCandidateCount).toBe(2);
    expect(result.dailyNews.categories["ai-ml"]).toHaveLength(3);
    expect(result.dailyNews.categories["computer-systems"].map((news) => news.id)).not.toContain(
      "wrong-category"
    );
    expect(result.debug.rejected).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "stale-ai-paper",
          kind: "age"
        }),
        expect.objectContaining({
          id: "ai-repo-deal",
          kind: "quality"
        })
      ])
    );
  });

  it("preserves GitHub fallback while recording a real targeted arXiv failure", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloud runtime architecture benchmark"
      }),
      item({
        id: "cloud-2",
        title: "Cloud observability implementation guide",
        sourceName: "Cloud Engineering"
      }),
      item({
        id: "cloud-3",
        title: "Platform reliability production case study",
        sourceName: "Platform Engineering"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchArxivCategoryCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? targetedFailure("HTTP 503 Service Unavailable")
        : targetedItems()
    );
    fetchGithubRepositoriesMock.mockImplementation(
      async ({ categoryIds }: { categoryIds?: readonly CategoryId[] } = {}) =>
        categoryIds?.includes("cloud-infrastructure")
          ? targetedItems([
              item({
                id: "cloud-github",
                title: "platform-lab/cloud-reliability",
                sourceName: "GitHub",
                sourceType: "repo"
              })
            ])
          : categoryIds
            ? targetedItems()
            : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({
      now,
      startedAt: "2026-06-12T12:00:00.000Z",
      storage: storage as never
    });

    expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(4);
    expect(result.dailyNews.categories["cloud-infrastructure"].map((news) => news.id)).toContain(
      "cloud-github"
    );
    expect(result.failedSources).toEqual(
      expect.arrayContaining([
        {
          sourceName: "Fallback discovery: cloud-infrastructure arXiv",
          reason: "HTTP 503 Service Unavailable",
          at: "2026-06-12T12:00:00.000Z"
        }
      ])
    );
  });

  it("preserves arXiv fallback and marks the category failed when targeted GitHub fails", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "systems-1",
        title: "Kernel scheduler architecture benchmark",
        category: "computer-systems"
      }),
      item({
        id: "systems-2",
        title: "Distributed storage implementation guide",
        category: "computer-systems",
        sourceName: "Systems Engineering"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchArxivCategoryCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "computer-systems"
        ? targetedItems([
            item({
              id: "systems-arxiv",
              title: "Operating system memory scheduling evaluation",
              category: "computer-systems",
              sourceName: "arXiv",
              sourceType: "paper"
            })
          ])
        : targetedItems()
    );
    fetchGithubRepositoriesMock.mockImplementation(
      async ({ categoryIds }: { categoryIds?: readonly CategoryId[] } = {}) =>
        categoryIds?.includes("computer-systems")
          ? targetedFailure("GitHub socket reset")
          : categoryIds
            ? targetedItems()
            : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({
      now,
      startedAt: "2026-06-12T12:00:00.000Z",
      storage: storage as never
    });

    expect(result.dailyNews.categories["computer-systems"].map((news) => news.id)).toEqual(
      expect.arrayContaining(["systems-1", "systems-2", "systems-arxiv"])
    );
    expect(result.debug.underfilledCategories?.["computer-systems"]?.reason).toBe(
      "fallback_source_failure"
    );
    expect(result.failedSources).toEqual(
      expect.arrayContaining([
        {
          sourceName: "Fallback discovery: computer-systems GitHub",
          reason: "GitHub socket reset",
          at: "2026-06-12T12:00:00.000Z"
        }
      ])
    );
  });

  it("keeps a required section underfilled when its fourth candidate is a shopping deal", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloudflare runtime architecture benchmark"
      }),
      item({
        id: "cloud-2",
        title: "AWS observability architecture guide",
        sourceName: "AWS Blog"
      }),
      item({
        id: "cloud-3",
        title: "Azure platform reliability implementation details",
        sourceName: "Azure Blog"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? [
            item({
              id: "cloud-shopping-deal",
              title: "Best Prime Day cloud server deals at 40% off",
              summary: "Shop this limited-time affiliate deal and save on a cloud server bundle.",
              sourceName: "Consumer Tech",
              sourceType: "news",
              tags: ["shopping", "deal", "affiliate"]
            })
          ]
        : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(3);
    expect(result.debug.rejectedBySalesPromotion).toBeGreaterThan(0);
    expect(result.debug.minimumMetByCategory["cloud-infrastructure"]).toBe(false);
    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]).toMatchObject({
      attemptedFallback: true,
      selectedCount: 3,
      targetCount: 4,
      reason: "quality_filters_rejected_candidates"
    });
    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]?.message).toMatch(
      /selected 3 of 4.*no filler/i
    );
  });

  it("does not trigger quota fallback for Research Papers", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([]);
    fetchArxivPapersMock.mockResolvedValue([
      item({
        id: "paper-1",
        title: "Distributed systems research benchmark one",
        sourceName: "arXiv",
        sourceType: "paper",
        category: "research-papers",
        tags: ["arxiv", "research", "benchmark"]
      })
    ]);
    fetchTrustedXPostsMock.mockResolvedValue([]);

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.dailyNews.categories["research-papers"]).toHaveLength(1);
    expect(fetchCategoryFallbackCandidatesMock).not.toHaveBeenCalledWith({
      categoryId: "research-papers",
      now
    });
    expect(result.debug.underfilledCategories).not.toHaveProperty("research-papers");
  });

  it("includes repository candidates in selection diagnostics and source breakdown", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchGithubRepositoriesMock.mockImplementation(
      async ({ categoryIds }: { categoryIds?: readonly CategoryId[] } = {}) =>
        categoryIds
          ? targetedItems()
          : [
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
            ]
    );

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

    expect(result.debug.underfilledCategories?.["embedded-systems"]).toEqual({
      attemptedFallback: true,
      selectedCount: 1,
      targetCount: 4,
      reason: "insufficient_fresh_candidates",
      message:
        "Selected 1 of 4 required high-signal fresh items after fallback discovery. No filler was added; the section shows only candidates that passed the existing quality gates."
    });
    expect(result.debug.minimumMetByCategory["embedded-systems"]).toBe(false);
  });

  it("reports fallback source failure for the affected required section", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloudflare runtime architecture benchmark"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) => {
      if (categoryId === "cloud-infrastructure") {
        throw new Error("cloud fallback timed out");
      }

      return [];
    });

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]).toMatchObject({
      attemptedFallback: true,
      selectedCount: 1,
      targetCount: 4,
      reason: "fallback_source_failure"
    });
    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]?.message).toMatch(
      /selected 1 of 4.*fallback discovery failed.*no filler/i
    );
  });

  it("uses healthy fallback feed items while reporting a real per-source fallback failure", async () => {
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
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).includes("healthy-feed")) {
          return new Response(
            `<?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <title>Healthy Cloud Feed</title>
                  <link>https://healthy.example</link>
                  <item>
                    <title>Cloud runtime observability implementation guide</title>
                    <link>https://healthy.example/cloud-runtime</link>
                    <description>A technical cloud infrastructure guide with runtime architecture, observability, reliability, benchmarks, and production implementation details.</description>
                    <pubDate>Fri, 12 Jun 2026 09:00:00 GMT</pubDate>
                  </item>
                </channel>
              </rss>`,
            { status: 200 }
          );
        }

        return new Response("Service unavailable", {
          status: 503,
          statusText: "Service Unavailable"
        });
      })
    );
    fetchCategoryFallbackCandidatesMock.mockImplementation(
      async ({
        categoryId,
        now: fallbackNow,
        onSourceFailure
      }: {
        categoryId: CategoryId;
        now: Date;
        onSourceFailure?: (failure: SourceFetchFailureDiagnostic) => void;
      }) => {
        if (categoryId !== "cloud-infrastructure") {
          return [];
        }

        const actual = await vi.importActual<typeof import("@/lib/news/fetchSources")>(
          "@/lib/news/fetchSources"
        );
        const sources = [
          {
            name: "Healthy Cloud Feed",
            homepageUrl: "https://healthy.example",
            rssUrl: "https://healthy.example/healthy-feed.xml",
            sourceType: "official",
            trustScore: 0.9,
            categoryHints: ["cloud-infrastructure"],
            allowedCategories: ["cloud-infrastructure"]
          },
          {
            name: "Broken Cloud Feed",
            homepageUrl: "https://broken.example",
            rssUrl: "https://broken.example/broken-feed.xml",
            sourceType: "official",
            trustScore: 0.9,
            categoryHints: ["cloud-infrastructure"],
            allowedCategories: ["cloud-infrastructure"]
          }
        ] as TrustedSourceConfig[];

        return actual.fetchCategoryFallbackCandidates({
          categoryId,
          sources,
          now: fallbackNow,
          onSourceFailure
        });
      }
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({
      now,
      startedAt: "2026-06-12T12:00:00.000Z",
      storage: storage as never
    });

    expect(result.dailyNews.categories["cloud-infrastructure"].map((news) => news.url)).toContain(
      "https://healthy.example/cloud-runtime"
    );
    expect(result.dailyNews.categories["cloud-infrastructure"]).toHaveLength(3);
    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]?.reason).toBe(
      "fallback_source_failure"
    );
    expect(result.failedSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceName: expect.stringContaining("Broken Cloud Feed"),
          reason: expect.stringMatching(/503.*service unavailable/i),
          at: "2026-06-12T12:00:00.000Z"
        })
      ])
    );
  });

  it("does not treat duplicate title text as a quality rejection", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-1",
        title: "Cloud runtime implementation details"
      }),
      item({
        id: "cloud-2",
        title: "AWS observability architecture guide",
        sourceName: "AWS Blog"
      }),
      item({
        id: "cloud-3",
        title: "Azure platform reliability benchmark",
        sourceName: "Azure Blog"
      })
    ]);
    fetchArxivPapersMock.mockResolvedValue([]);
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockImplementation(async ({ categoryId }) =>
      categoryId === "cloud-infrastructure"
        ? [
            item({
              id: "cloud-duplicate",
              title: "Cloud runtime implementation details",
              url: "https://duplicate.example/cloud-runtime",
              canonicalUrl: "https://duplicate.example/cloud-runtime",
              sourceName: "Duplicate Engineering"
            })
          ]
        : []
    );

    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn()
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.debug.rejected).toContainEqual(
      expect.objectContaining({
        id: "cloud-duplicate",
        category: "cloud-infrastructure",
        kind: "duplicate"
      })
    );
    expect(result.debug.underfilledCategories?.["cloud-infrastructure"]?.reason).toBe(
      "insufficient_fresh_candidates"
    );
  });

  it("continues with healthy sources and records failed source diagnostics", async () => {
    fetchSourceCandidatesMock.mockResolvedValue([
      item({
        id: "cloud-healthy",
        title: "Cloudflare runtime architecture benchmark"
      })
    ]);
    fetchArxivPapersMock.mockRejectedValue(new Error("arXiv timed out"));
    fetchTrustedXPostsMock.mockResolvedValue([]);
    fetchCategoryFallbackCandidatesMock.mockResolvedValue([]);

    let writtenLastRefresh: LastRefresh | undefined;
    const storage = {
      readDailyNews: vi.fn(async () => emptyDailyNews()),
      writeDailyNews: vi.fn(),
      writeLastRefresh: vi.fn(async (lastRefresh: LastRefresh) => {
        writtenLastRefresh = lastRefresh;
      })
    };

    const result = await refreshNews({ now, storage: storage as never });

    expect(result.dailyNews.categories["cloud-infrastructure"].map((news) => news.id)).toContain(
      "cloud-healthy"
    );
    expect(result.failedSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceName: "arXiv",
          reason: "arXiv timed out"
        })
      ])
    );
    expect(writtenLastRefresh?.failedSources).toEqual(result.failedSources);
  });
});
