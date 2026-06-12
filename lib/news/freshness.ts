import type { NewsItem } from "@/types/news";

export const FRESHNESS_WINDOW_HOURS = 72;
const FUTURE_TOLERANCE_MINUTES = 10;
const HOUR_MS = 60 * 60 * 1000;

export type FreshnessResult = {
  accepted: boolean;
  freshnessScore: number;
  publishedAt?: string;
  excludedReason?: string;
};

function parseTrustworthyDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

export function evaluateFreshness({
  publishedAt,
  updatedAt,
  now = new Date()
}: {
  publishedAt?: string;
  updatedAt?: string;
  now?: Date;
}): FreshnessResult {
  const date = parseTrustworthyDate(publishedAt) ?? parseTrustworthyDate(updatedAt);

  if (!date) {
    return {
      accepted: false,
      freshnessScore: 0,
      excludedReason: "Rejected because no trustworthy date was available."
    };
  }

  const ageMs = now.getTime() - date.getTime();
  const futureToleranceMs = FUTURE_TOLERANCE_MINUTES * 60 * 1000;

  if (ageMs < -futureToleranceMs) {
    return {
      accepted: false,
      freshnessScore: 0,
      publishedAt: date.toISOString(),
      excludedReason: "Rejected because the published date is suspiciously far in the future."
    };
  }

  const ageHours = Math.max(0, ageMs / HOUR_MS);
  if (ageHours > FRESHNESS_WINDOW_HOURS) {
    return {
      accepted: false,
      freshnessScore: 0,
      publishedAt: date.toISOString(),
      excludedReason: "Rejected because it is older than 72 hours."
    };
  }

  return {
    accepted: true,
    publishedAt: date.toISOString(),
    freshnessScore: Math.max(0.5, 5 - (ageHours / FRESHNESS_WINDOW_HOURS) * 4.5)
  };
}

export function isFreshNewsItem(item: Pick<NewsItem, "publishedAt">, now = new Date()) {
  return evaluateFreshness({ publishedAt: item.publishedAt, now }).accepted;
}

export function filterFreshNewsItems<T extends Pick<NewsItem, "publishedAt">>(
  items: T[],
  now = new Date()
) {
  return items.filter((item) => isFreshNewsItem(item, now));
}
