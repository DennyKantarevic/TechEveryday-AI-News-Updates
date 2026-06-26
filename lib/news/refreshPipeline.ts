import {
  CATEGORY_IDS,
  MIN_ITEMS_PER_SECTION,
  REQUIRED_SECTION_IDS,
  createCategoryRecord
} from "@/config/categories";
import { archiveMetadata } from "@/lib/news/calendar";
import { scoreContentQuality, selectDailyItemsWithDebug } from "@/lib/news/classify";
import { evaluateFreshness } from "@/lib/news/freshness";
import {
  arxivRequestUrl,
  fetchArxivCategoryCandidates,
  fetchArxivPapersWithDiagnostics
} from "@/lib/news/fetchArxiv";
import { fetchGithubRepositories } from "@/lib/news/fetchGithubRepos";
import { fetchNewsApiCandidates } from "@/lib/news/fetchNewsApi";
import {
  fetchCategoryFallbackCandidates,
  fetchSourceCandidates
} from "@/lib/news/fetchSources";
import { fetchTrustedXPosts } from "@/lib/news/fetchX";
import { safeRefreshErrorMessage } from "@/lib/news/refreshErrors";
import { getAmericaNewYorkDateKey } from "@/lib/news/refreshSchedule";
import { newsSnapshotStorage, type NewsSnapshotStorage } from "@/lib/news/snapshotStorage";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";
import type { RequiredSectionId } from "@/config/categories";
import type {
  DailyNews,
  LastRefresh,
  NewsItem,
  RefreshDebug,
  RefreshSourceFailure,
  UnderfilledCategoryDiagnostic
} from "@/types/news";

type RefreshOptions = {
  now?: Date;
  storage?: NewsSnapshotStorage;
  startedAt?: string;
  trigger?: LastRefresh["trigger"];
  lastRefreshDateAmericaNewYork?: string;
};

function previousXItems(previousDailyNews: DailyNews, now: Date) {
  if (process.env.X_BEARER_TOKEN) {
    return [];
  }

  return Object.values(previousDailyNews.categories)
    .flat()
    .filter((item) => item.sourceType === "x")
    .map((item) => ({
      ...item,
      foundAt: now.toISOString(),
      saved: false
    }));
}

function categoryCounts(categories: DailyNews["categories"]) {
  return CATEGORY_IDS.reduce(
    (counts, categoryId) => ({
      ...counts,
      [categoryId]: categories[categoryId]?.length ?? 0
    }),
    {} as LastRefresh["categoryCounts"]
  );
}

function underfilledCategoryIds(categories: DailyNews["categories"]) {
  return REQUIRED_SECTION_IDS.filter(
    (categoryId) => (categories[categoryId]?.length ?? 0) < MIN_ITEMS_PER_SECTION
  );
}

function isQualityRejection(rejection: RefreshDebug["rejected"][number]) {
  return (
    rejection.kind === "quality" ||
    ["sales_or_promotion", "shopping_or_deal", "consumer_buying_guide"].includes(
      rejection.reasonCode ?? ""
    )
  );
}

function underfilledMessage({
  reason,
  selectedCount
}: {
  reason: UnderfilledCategoryDiagnostic["reason"];
  selectedCount: number;
}) {
  if (reason === "fallback_source_failure") {
    return `Selected ${selectedCount} of ${MIN_ITEMS_PER_SECTION} required high-signal fresh items because fallback discovery failed. No filler was added; the section shows only candidates that passed the existing quality gates.`;
  }

  if (reason === "quality_filters_rejected_candidates") {
    return `Selected ${selectedCount} of ${MIN_ITEMS_PER_SECTION} required high-signal fresh items after additional candidates were rejected by the existing quality filters. No filler was added; the section shows only candidates that passed the existing quality gates.`;
  }

  return `Selected ${selectedCount} of ${MIN_ITEMS_PER_SECTION} required high-signal fresh items after fallback discovery. No filler was added; the section shows only candidates that passed the existing quality gates.`;
}

function underfilledDebug(
  categories: DailyNews["categories"],
  attemptedFallback: Set<RequiredSectionId>,
  fallbackFailedCategoryIds: Set<RequiredSectionId>,
  rejected: RefreshDebug["rejected"]
) {
  return Object.fromEntries(
    underfilledCategoryIds(categories).map((categoryId) => {
      const selectedCount = categories[categoryId]?.length ?? 0;
      const reason: UnderfilledCategoryDiagnostic["reason"] =
        fallbackFailedCategoryIds.has(categoryId)
          ? "fallback_source_failure"
          : rejected.some(
                (candidate) =>
                  candidate.category === categoryId && isQualityRejection(candidate)
              )
            ? "quality_filters_rejected_candidates"
            : "insufficient_fresh_candidates";

      return [
        categoryId,
        {
          attemptedFallback: attemptedFallback.has(categoryId),
          selectedCount,
          targetCount: MIN_ITEMS_PER_SECTION,
          reason,
          message: underfilledMessage({ reason, selectedCount })
        }
      ];
    })
  ) as NonNullable<LastRefresh["debug"]>["underfilledCategories"];
}

async function collectCandidates({
  sourceName,
  at,
  fetcher
}: {
  sourceName: string;
  at: string;
  fetcher: () => Promise<NewsItem[]>;
}) {
  try {
    return {
      items: await fetcher(),
      failedSource: null
    };
  } catch (error) {
    return {
      items: [],
      failedSource: {
        sourceName,
        reason: safeRefreshErrorMessage(error),
        at
      } satisfies RefreshSourceFailure
    };
  }
}

export async function refreshNews(options: RefreshOptions = {}) {
  const now = options.now ?? new Date();
  const storage = options.storage ?? newsSnapshotStorage;
  const startedAt = options.startedAt ?? now.toISOString();
  const previousDailyNews = await storage.readDailyNews();
  const [sourceResult, arxivResult, repoResult, newsApiResult, xResult] = await Promise.all([
    collectCandidates({
      sourceName: "RSS trusted sources",
      at: startedAt,
      fetcher: () => fetchSourceCandidates({ now })
    }),
    (async () => {
      try {
        const result = await fetchArxivPapersWithDiagnostics({ now });
        return {
          items: result.items,
          failedSource: null,
          diagnostics: result.diagnostics
        };
      } catch (error) {
        return {
          items: [],
          failedSource: {
            sourceName: "arXiv",
            reason: safeRefreshErrorMessage(error),
            at: startedAt
          } satisfies RefreshSourceFailure,
          diagnostics: {
            requestUrl: arxivRequestUrl(),
            rawCount: 0,
            parsedCount: 0
          }
        };
      }
    })(),
    collectCandidates({
      sourceName: "GitHub repositories",
      at: startedAt,
      fetcher: () => fetchGithubRepositories({ now })
    }),
    collectCandidates({
      sourceName: "NewsAPI",
      at: startedAt,
      fetcher: () => fetchNewsApiCandidates({ now })
    }),
    collectCandidates({
      sourceName: "Trusted X posts",
      at: startedAt,
      fetcher: () => fetchTrustedXPosts({ now })
    })
  ]);
  const failedSources = [
    sourceResult.failedSource,
    arxivResult.failedSource,
    repoResult.failedSource,
    newsApiResult.failedSource,
    xResult.failedSource
  ].filter((failure): failure is RefreshSourceFailure => Boolean(failure));
  const sourceItems = sourceResult.items;
  const arxivItems = arxivResult.items;
  const repoItems = repoResult.items;
  const newsApiItems = newsApiResult.items;
  const xItems = xResult.items;

  const candidates = [
    ...sourceItems,
    ...arxivItems,
    ...repoItems,
    ...newsApiItems,
    ...xItems,
    ...previousXItems(previousDailyNews, now)
  ];

  if (!candidates.length && failedSources.length === 5) {
    throw new Error("All candidate sources failed.");
  }

  const firstSelection = selectDailyItemsWithDebug({
    candidates,
    previousCategories: previousDailyNews.categories,
    now
  });
  const fallbackCategoryIds = underfilledCategoryIds(firstSelection.categories);
  const attemptedFallback = new Set(fallbackCategoryIds);
  const fallbackFailedCategoryIds = new Set<RequiredSectionId>();
  const fallbackFailures: RefreshSourceFailure[] = [];
  const recordFallbackFailure = ({
    categoryId,
    poolName,
    error,
    sourceName
  }: {
    categoryId: RequiredSectionId;
    poolName: "RSS" | "arXiv" | "GitHub";
    error: unknown;
    sourceName?: string;
  }) => {
    fallbackFailedCategoryIds.add(categoryId);
    fallbackFailures.push({
      sourceName: `Fallback discovery: ${categoryId} ${poolName}${sourceName ? `: ${sourceName}` : ""}`,
      reason: safeRefreshErrorMessage(error),
      at: startedAt
    });
  };
  const fallbackResults = await Promise.all(
    fallbackCategoryIds.map(async (categoryId) => {
      const [rssResult, arxivFallbackResult, githubFallbackResult] = await Promise.allSettled([
        fetchCategoryFallbackCandidates({
          categoryId,
          now,
          onSourceFailure: ({ sourceName, error }) => {
            recordFallbackFailure({
              categoryId,
              poolName: "RSS",
              sourceName,
              error
            });
          }
        }),
        fetchArxivCategoryCandidates({
          categoryId,
          now
        }),
        fetchGithubRepositories({
          categoryIds: [categoryId],
          now
        })
      ]);

      const items: NewsItem[] = [];

      if (rssResult.status === "rejected") {
        recordFallbackFailure({
          categoryId,
          poolName: "RSS",
          error: rssResult.reason
        });
      } else {
        items.push(...rssResult.value.filter((item) => item.category === categoryId));
      }

      if (arxivFallbackResult.status === "rejected") {
        recordFallbackFailure({
          categoryId,
          poolName: "arXiv",
          error: arxivFallbackResult.reason
        });
      } else {
        if (arxivFallbackResult.value.failure) {
          recordFallbackFailure({
            categoryId,
            poolName: "arXiv",
            error: arxivFallbackResult.value.failure
          });
        }
        items.push(
          ...arxivFallbackResult.value.items.filter((item) => item.category === categoryId)
        );
      }

      if (githubFallbackResult.status === "rejected") {
        recordFallbackFailure({
          categoryId,
          poolName: "GitHub",
          error: githubFallbackResult.reason
        });
      } else {
        if (githubFallbackResult.value.failure) {
          recordFallbackFailure({
            categoryId,
            poolName: "GitHub",
            error: githubFallbackResult.value.failure
          });
        }
        items.push(
          ...githubFallbackResult.value.items.filter((item) => item.category === categoryId)
        );
      }

      return items;
    })
  );
  failedSources.push(...fallbackFailures);
  const fallbackItems = fallbackResults.flat();
  const finalSelection = fallbackItems.length
    ? selectDailyItemsWithDebug({
        candidates: [...candidates, ...fallbackItems],
        previousCategories: previousDailyNews.categories,
        now
      })
    : firstSelection;
  const categories = finalSelection.categories;
  const selectedItems = Object.values(categories).flat();
  const arxivSelectedCount = selectedItems.filter((item) => item.sourceName === "arXiv").length;
  const arxivAfterFreshnessCount = arxivItems.filter((item) =>
    evaluateFreshness({ publishedAt: item.publishedAt, now }).accepted
  ).length;
  const arxivAfterQualityCount = arxivItems.filter((item) => {
    const freshness = evaluateFreshness({ publishedAt: item.publishedAt, now });
    const quality = scoreContentQuality(item);
    return freshness.accepted && !quality.excludedReason;
  }).length;
  const archiveSnapshotDate =
    options.lastRefreshDateAmericaNewYork ?? getAmericaNewYorkDateKey(now);
  const existingArchiveSummaries =
    typeof storage.listArchiveSnapshots === "function"
      ? await storage.listArchiveSnapshots()
      : [];
  const nextArchiveSummary = {
    date: archiveSnapshotDate,
    itemCount: selectedItems.length,
    sectionCounts: categoryCounts(categories),
    updatedAt: now.toISOString()
  };
  const archiveSummaries = [
    nextArchiveSummary,
    ...existingArchiveSummaries.filter(
      (summary) => summary.date !== archiveSnapshotDate
    )
  ].sort((left, right) => right.date.localeCompare(left.date));
  const archiveDebug = archiveMetadata(archiveSummaries, archiveSnapshotDate);
  const debug = {
    ...finalSelection.debug,
    fallbackCandidateCount: fallbackItems.length,
    sourceDiagnostics: {
      arXiv: {
        requestUrl: arxivRequestUrl(),
        rawCount: arxivResult.diagnostics.rawCount,
        afterFreshnessCount: arxivAfterFreshnessCount,
        afterQualityCount: arxivAfterQualityCount,
        selectedCount: arxivSelectedCount
      }
    },
    failedSources,
    archiveSnapshotDate,
    ...archiveDebug,
    underfilledCategories: underfilledDebug(
      categories,
      attemptedFallback,
      fallbackFailedCategoryIds,
      finalSelection.debug.rejected
    )
  };
  const dailyNews: DailyNews = {
    refreshedAt: now.toISOString(),
    timezone: REFRESH_TIME_ZONE,
    categories
  };
  const refreshStatus: LastRefresh = {
    refreshedAt: now.toISOString(),
    nextRefreshAt: getNextRefreshAt(now).toISOString(),
    lastRefreshStartedAt: startedAt,
    lastRefreshCompletedAt: now.toISOString(),
    lastRefreshDateAmericaNewYork: archiveSnapshotDate,
    itemsFound: candidates.length,
    itemsSelected: selectedItems.length,
    errors: [],
    failedSources,
    trigger: options.trigger ?? "api",
    candidateCount: candidates.length,
    categoryCounts: categoryCounts(categories),
    status: "success",
    message:
      selectedItems.length === 0
        ? "No high-signal new items found in the last 72 hours."
        : "Refresh completed with fresh high-signal items.",
    debug
  };

  if (typeof storage.writeSuccessfulSnapshot === "function") {
    await storage.writeSuccessfulSnapshot({
      date: archiveSnapshotDate,
      dailyNews,
      lastRefresh: refreshStatus
    });
  } else {
    await storage.writeDailyNews(dailyNews);
    await storage.writeLastRefresh(refreshStatus);
  }

  return {
    dailyNews,
    candidateCount: candidates.length,
    debug,
    failedSources,
    sourceBreakdown: {
      rss: sourceItems.length,
      arxiv: arxivItems.length,
      repos: repoItems.length,
      newsApi: newsApiItems.length,
      x: xItems.length
    }
  };
}

export function mergeSavedState(items: NewsItem[], savedItems: NewsItem[]) {
  const savedIds = new Set(savedItems.map((item) => item.id));
  return items.map((item) => ({
    ...item,
    saved: savedIds.has(item.id)
  }));
}

export function emptyCategoryCounts() {
  return createCategoryRecord(() => 0);
}
