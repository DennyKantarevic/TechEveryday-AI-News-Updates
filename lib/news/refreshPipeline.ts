import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { scoreContentQuality, selectDailyItemsWithDebug } from "@/lib/news/classify";
import { evaluateFreshness } from "@/lib/news/freshness";
import { arxivRequestUrl, fetchArxivPapersWithDiagnostics } from "@/lib/news/fetchArxiv";
import { fetchGithubRepositories } from "@/lib/news/fetchGithubRepos";
import { fetchNewsApiCandidates } from "@/lib/news/fetchNewsApi";
import {
  fetchCategoryFallbackCandidates,
  fetchSourceCandidates
} from "@/lib/news/fetchSources";
import { fetchTrustedXPosts } from "@/lib/news/fetchX";
import { safeRefreshErrorMessage } from "@/lib/news/refreshErrors";
import { newsSnapshotStorage, type NewsSnapshotStorage } from "@/lib/news/snapshotStorage";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";
import type { DailyNews, LastRefresh, NewsItem, RefreshSourceFailure } from "@/types/news";

type RefreshOptions = {
  now?: Date;
  storage?: NewsSnapshotStorage;
  startedAt?: string;
  trigger?: LastRefresh["trigger"];
  lastRefreshDateAmericaNewYork?: string;
};

const TARGET_ITEMS_PER_CATEGORY = 3;

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
  return CATEGORY_IDS.filter(
    (categoryId) => (categories[categoryId]?.length ?? 0) < TARGET_ITEMS_PER_CATEGORY
  );
}

function underfilledDebug(
  categories: DailyNews["categories"],
  attemptedFallback: Set<string>
) {
  return Object.fromEntries(
    underfilledCategoryIds(categories).map((categoryId) => {
      const selectedCount = categories[categoryId]?.length ?? 0;

      return [
        categoryId,
        {
          attemptedFallback: attemptedFallback.has(categoryId),
          selectedCount,
          targetCount: TARGET_ITEMS_PER_CATEGORY,
          message: `Only ${selectedCount} high-signal fresh ${
            selectedCount === 1 ? "item" : "items"
          } found after fallback discovery; showing the best available fresh items.`
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
  const fallbackResults = await Promise.allSettled(
    fallbackCategoryIds.map((categoryId) =>
      fetchCategoryFallbackCandidates({
        categoryId,
        now
      })
    )
  );
  const fallbackFailures = fallbackResults.flatMap((result, index) =>
    result.status === "rejected"
      ? [
          {
            sourceName: `Fallback discovery: ${fallbackCategoryIds[index]}`,
            reason: safeRefreshErrorMessage(result.reason),
            at: startedAt
          } satisfies RefreshSourceFailure
        ]
      : []
  );
  failedSources.push(...fallbackFailures);
  const fallbackItems = fallbackResults.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );
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
    underfilledCategories: underfilledDebug(categories, attemptedFallback)
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
    lastRefreshDateAmericaNewYork: options.lastRefreshDateAmericaNewYork,
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

  await storage.writeDailyNews(dailyNews);
  await storage.writeLastRefresh(refreshStatus);

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
