import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import type { ArchiveSnapshotSummary, DailyNews } from "@/types/news";

export const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isCalendarDate(value: string) {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function sectionCounts(dailyNews: DailyNews) {
  return createCategoryRecord(
    (categoryId) => dailyNews.categories[categoryId]?.length ?? 0
  );
}

export function totalItems(dailyNews: DailyNews) {
  return CATEGORY_IDS.reduce(
    (total, categoryId) => total + (dailyNews.categories[categoryId]?.length ?? 0),
    0
  );
}

export function archiveMetadata(
  summaries: ArchiveSnapshotSummary[],
  latestSnapshotDate?: string | null
) {
  return {
    availableArchiveDatesCount: summaries.length,
    latestSnapshotDate: latestSnapshotDate ?? summaries[0]?.date ?? null,
    latestHistoricalSnapshotDate: summaries[0]?.date ?? null
  };
}
