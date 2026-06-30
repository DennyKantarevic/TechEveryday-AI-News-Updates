import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { selectDailyItemsWithDebug } from "@/lib/news/classify";
import { fetchArxivPapers } from "@/lib/news/fetchArxiv";
import { fetchGithubRepositories } from "@/lib/news/fetchGithubRepos";
import { fetchNewsApiCandidates } from "@/lib/news/fetchNewsApi";
import {
  fetchCategoryFallbackCandidates,
  fetchSourceCandidates
} from "@/lib/news/fetchSources";
import { fetchTrustedXPosts } from "@/lib/news/fetchX";
import {
  MIN_ITEMS_PER_SECTION,
  REQUIRED_SECTION_IDS
} from "@/lib/news/sectionQuotas";
import { fileStorage } from "@/lib/storage";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";
import type {
  DailyNews,
  LastRefresh,
  NewsItem,
  RefreshDebug,
  SectionSelectionDiagnostics,
  UnderfilledSectionReason
} from "@/types/news";
import type { FileStorage } from "@/lib/storage";

type RefreshOptions = {
  now?: Date;
  storage?: FileStorage;
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

function uniqueReasons(reasons: UnderfilledSectionReason[]) {
  return Array.from(new Set(reasons));
}

function underfilledReasons(
  diagnostics: SectionSelectionDiagnostics | undefined,
  selectedCount: number
): UnderfilledSectionReason[] {
  if (!diagnostics) {
    return ["source/category shortage"];
  }

  const reasons: UnderfilledSectionReason[] = [];

  if (diagnostics.totalCandidates === 0) {
    reasons.push("source/category shortage");
  } else if (diagnostics.candidatesAfterFreshness < MIN_ITEMS_PER_SECTION) {
    reasons.push("not enough fresh candidates");
  }

  if (
    diagnostics.candidatesAfterFreshness >= MIN_ITEMS_PER_SECTION &&
    (diagnostics.rejectedBySalesPromotion > 0 || diagnostics.rejectedAsConsumerFiller > 0) &&
    diagnostics.candidatesAfterQuality < MIN_ITEMS_PER_SECTION
  ) {
    reasons.push("rejected as sales/promotion/filler");
  }

  if (
    diagnostics.candidatesAfterFreshness >= MIN_ITEMS_PER_SECTION &&
    diagnostics.rejectedByQuality > 0 &&
    diagnostics.candidatesAfterQuality < MIN_ITEMS_PER_SECTION
  ) {
    reasons.push("rejected by quality filter");
  }

  if (
    diagnostics.candidatesAfterQuality >= MIN_ITEMS_PER_SECTION &&
    diagnostics.candidatesAfterDeduplication < MIN_ITEMS_PER_SECTION &&
    diagnostics.rejectedByDuplicate > 0
  ) {
    reasons.push("deduplicated");
  }

  if (
    diagnostics.candidatesAfterDeduplication >= MIN_ITEMS_PER_SECTION &&
    selectedCount < MIN_ITEMS_PER_SECTION
  ) {
    reasons.push("section cap/final cap issue");
  }

  return uniqueReasons(reasons.length ? reasons : ["not enough fresh candidates"]);
}

function underfilledDebug(
  categories: DailyNews["categories"],
  attemptedFallback: Set<string>,
  selectionDebug: RefreshDebug
) {
  return Object.fromEntries(
    underfilledCategoryIds(categories).map((categoryId) => {
      const selectedCount = categories[categoryId]?.length ?? 0;
      const reasons = underfilledReasons(
        selectionDebug.sectionSelectionDiagnostics?.[categoryId],
        selectedCount
      );
      const reasonText = reasons.join(", ");

      return [
        categoryId,
        {
          attemptedFallback: attemptedFallback.has(categoryId),
          selectedCount,
          targetCount: MIN_ITEMS_PER_SECTION,
          reasons,
          message: `Only ${selectedCount} high-signal fresh ${
            selectedCount === 1 ? "item" : "items"
          } found after fallback discovery; showing the best available fresh items. Reason${
            reasons.length === 1 ? "" : "s"
          }: ${reasonText}.`
        }
      ];
    })
  ) as NonNullable<LastRefresh["debug"]>["underfilledCategories"];
}

export async function refreshNews(options: RefreshOptions = {}) {
  const now = options.now ?? new Date();
  const storage = options.storage ?? fileStorage;
  const previousDailyNews = await storage.readDailyNews();
  const [sourceItems, arxivItems, repoItems, newsApiItems, xItems] = await Promise.all([
    fetchSourceCandidates({ now }),
    fetchArxivPapers({ now }),
    fetchGithubRepositories({ now }),
    fetchNewsApiCandidates({ now }),
    fetchTrustedXPosts({ now })
  ]);

  const candidates = [
    ...sourceItems,
    ...arxivItems,
    ...repoItems,
    ...newsApiItems,
    ...xItems,
    ...previousXItems(previousDailyNews, now)
  ];
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
  const debug = {
    ...finalSelection.debug,
    fallbackCandidateCount: fallbackItems.length,
    underfilledCategories: underfilledDebug(categories, attemptedFallback, finalSelection.debug)
  };
  const dailyNews: DailyNews = {
    refreshedAt: now.toISOString(),
    timezone: REFRESH_TIME_ZONE,
    categories
  };
  const refreshStatus: LastRefresh = {
    refreshedAt: now.toISOString(),
    nextRefreshAt: getNextRefreshAt(now).toISOString(),
    candidateCount: candidates.length,
    categoryCounts: categoryCounts(categories),
    status: "success",
    message:
      Object.values(categories).flat().length === 0
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
