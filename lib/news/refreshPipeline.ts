import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { dedupeCandidates, selectDailyItems } from "@/lib/news/classify";
import { fetchArxivPapers } from "@/lib/news/fetchArxiv";
import { fetchSourceCandidates } from "@/lib/news/fetchSources";
import { fetchTrustedXPosts } from "@/lib/news/fetchX";
import { categoriesWithStarterFallback } from "@/lib/news/starterContent";
import { fileStorage } from "@/lib/storage";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";
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

export async function refreshNews(options: RefreshOptions = {}) {
  const now = options.now ?? new Date();
  const storage = options.storage ?? fileStorage;
  const previousDailyNews = await storage.readDailyNews();
  const [sourceItems, arxivItems, xItems] = await Promise.all([
    fetchSourceCandidates({ now }),
    fetchArxivPapers({ now }),
    fetchTrustedXPosts({ now })
  ]);

  const candidates = dedupeCandidates([
    ...sourceItems,
    ...arxivItems,
    ...xItems,
    ...previousXItems(previousDailyNews, now)
  ]);
  const previousCategories = categoriesWithStarterFallback(previousDailyNews.categories, now);
  const categories = selectDailyItems({
    candidates,
    previousCategories,
    now
  });
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
      candidates.length === 0
        ? "No fresh trusted candidates were found; previous category content was preserved."
        : "Refresh completed."
  };

  await storage.writeDailyNews(dailyNews);
  await storage.writeLastRefresh(refreshStatus);

  return {
    dailyNews,
    candidateCount: candidates.length,
    sourceBreakdown: {
      rss: sourceItems.length,
      arxiv: arxivItems.length,
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
