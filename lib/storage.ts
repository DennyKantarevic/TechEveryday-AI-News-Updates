import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";
import type { CategoryId } from "@/config/categories";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

const DEFAULT_DATA_DIR = join(process.cwd(), "data");

function emptyDailyNews(): DailyNews {
  return {
    refreshedAt: new Date(0).toISOString(),
    timezone: REFRESH_TIME_ZONE,
    categories: createCategoryRecord(() => [])
  };
}

function emptyLastRefresh(): LastRefresh {
  return {
    refreshedAt: null,
    nextRefreshAt: getNextRefreshAt().toISOString(),
    lastRefreshStartedAt: null,
    lastRefreshCompletedAt: null,
    lastRefreshDateAmericaNewYork: null,
    itemsFound: 0,
    itemsSelected: 0,
    errors: [],
    failedSources: [],
    candidateCount: 0,
    categoryCounts: createCategoryRecord(() => 0),
    status: "skipped",
    message: "No refresh has run yet."
  };
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return fallback;
    }

    throw error;
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(join(path, ".."), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function normalizeNewsItem(item: NewsItem): NewsItem {
  return scoreNewsItem({
    ...item,
    canonicalUrl: item.canonicalUrl ?? canonicalizeUrl(item.url),
    imageUrl: item.imageUrl,
    freshnessScore: item.freshnessScore ?? 0,
    technicalDepthScore: item.technicalDepthScore ?? 0,
    educationalScore: item.educationalScore ?? 0,
    practicalUsefulnessScore: item.practicalUsefulnessScore ?? 0,
    noveltyScore: item.noveltyScore ?? 0,
    finalScore: item.finalScore ?? 0,
    saved: Boolean(item.saved),
    tags: item.tags ?? [],
    keyClaims: item.keyClaims ?? [],
    whyItMatters: item.whyItMatters ?? ""
  });
}

export function createFileStorage(baseDir = DEFAULT_DATA_DIR) {
  const dailyPath = join(baseDir, "daily-news.json");
  const galleryPath = join(baseDir, "gallery.json");
  const lastRefreshPath = join(baseDir, "last-refresh.json");

  return {
    async readDailyNews() {
      const daily = await readJson<DailyNews>(dailyPath, emptyDailyNews());
      const categories = createCategoryRecord((categoryId) =>
        (daily.categories?.[categoryId] ?? []).map(normalizeNewsItem)
      );

      return {
        ...daily,
        timezone: REFRESH_TIME_ZONE,
        categories
      } satisfies DailyNews;
    },

    async writeDailyNews(dailyNews: DailyNews) {
      await writeJson(dailyPath, dailyNews);
    },

    async readGallery() {
      const gallery = await readJson<NewsItem[]>(galleryPath, []);
      return gallery.map(normalizeNewsItem);
    },

    async writeGallery(items: NewsItem[]) {
      await writeJson(galleryPath, items);
    },

    async saveGalleryItem(item: NewsItem) {
      const gallery = await this.readGallery();
      const savedItem = {
        ...item,
        saved: true,
        foundAt: item.foundAt || new Date().toISOString()
      };
      const withoutExisting = gallery.filter((existing) => existing.id !== savedItem.id);
      const nextGallery = [savedItem, ...withoutExisting];
      await this.writeGallery(nextGallery);
      return savedItem;
    },

    async removeGalleryItem(id: string) {
      const gallery = await this.readGallery();
      const nextGallery = gallery.filter((item) => item.id !== id);
      await this.writeGallery(nextGallery);
      return nextGallery;
    },

    async readLastRefresh() {
      const refresh = await readJson<LastRefresh>(lastRefreshPath, emptyLastRefresh());
      return {
        ...refresh,
        lastRefreshStartedAt: refresh.lastRefreshStartedAt ?? null,
        lastRefreshCompletedAt: refresh.lastRefreshCompletedAt ?? refresh.refreshedAt,
        lastRefreshDateAmericaNewYork: refresh.lastRefreshDateAmericaNewYork ?? null,
        itemsFound: refresh.itemsFound ?? refresh.candidateCount ?? 0,
        itemsSelected:
          refresh.itemsSelected ??
          Object.values(refresh.categoryCounts ?? {}).reduce((sum, count) => sum + count, 0),
        errors: refresh.errors ?? [],
        failedSources: refresh.failedSources ?? refresh.debug?.failedSources ?? [],
        categoryCounts: CATEGORY_IDS.reduce(
          (counts, categoryId) => ({
            ...counts,
            [categoryId]: refresh.categoryCounts?.[categoryId] ?? 0
          }),
          {} as Record<CategoryId, number>
        )
      };
    },

    async writeLastRefresh(lastRefresh: LastRefresh) {
      await writeJson(lastRefreshPath, lastRefresh);
    }
  };
}

export const fileStorage = createFileStorage();
export type FileStorage = ReturnType<typeof createFileStorage>;
