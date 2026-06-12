import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { selectDailyItemsWithDebug } from "@/lib/news/classify";
import { fetchArxivPapers } from "@/lib/news/fetchArxiv";
import { fetchNewsApiCandidates } from "@/lib/news/fetchNewsApi";
import { fetchSourceCandidates } from "@/lib/news/fetchSources";
import { fetchTrustedXPosts } from "@/lib/news/fetchX";
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
  const [sourceItems, arxivItems, newsApiItems, xItems] = await Promise.all([
    fetchSourceCandidates({ now }),
    fetchArxivPapers({ now }),
    fetchNewsApiCandidates({ now }),
    fetchTrustedXPosts({ now })
  ]);

  const candidates = [
    ...sourceItems,
    ...arxivItems,
    ...newsApiItems,
    ...xItems,
    ...previousXItems(previousDailyNews, now)
  ];
  const { categories, debug } = selectDailyItemsWithDebug({
    candidates,
    previousCategories: previousDailyNews.categories,
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
