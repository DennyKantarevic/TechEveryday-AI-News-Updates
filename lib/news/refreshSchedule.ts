import {
  getZonedParts,
  isSameZonedDay,
  REFRESH_HOUR,
  REFRESH_TIME_ZONE
} from "@/lib/time";
import type { LastRefresh } from "@/types/news";

export type RefreshCronDecision =
  | {
      shouldRun: true;
      dateKey: string;
    }
  | {
      shouldRun: false;
      skipped: true;
      reason: "Not 7AM America/New_York" | "Already refreshed today";
      dateKey: string;
    };

export function getAmericaNewYorkDateKey(date: Date) {
  const parts = getZonedParts(date, REFRESH_TIME_ZONE);
  const year = String(parts.year).padStart(4, "0");
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function lastRefreshIsToday(lastRefresh: LastRefresh, now: Date, dateKey: string) {
  if (
    lastRefresh.lastRefreshDateAmericaNewYork === dateKey &&
    lastRefresh.status !== "error"
  ) {
    return true;
  }

  return Boolean(
    lastRefresh.status === "success" &&
      lastRefresh.refreshedAt &&
      isSameZonedDay(new Date(lastRefresh.refreshedAt), now)
  );
}

export function getRefreshCronDecision({
  now,
  lastRefresh
}: {
  now: Date;
  lastRefresh: LastRefresh;
}): RefreshCronDecision {
  const dateKey = getAmericaNewYorkDateKey(now);
  const parts = getZonedParts(now, REFRESH_TIME_ZONE);

  if (parts.hour !== REFRESH_HOUR) {
    return {
      shouldRun: false,
      skipped: true,
      reason: "Not 7AM America/New_York",
      dateKey
    };
  }

  if (lastRefreshIsToday(lastRefresh, now, dateKey)) {
    return {
      shouldRun: false,
      skipped: true,
      reason: "Already refreshed today",
      dateKey
    };
  }

  return {
    shouldRun: true,
    dateKey
  };
}
