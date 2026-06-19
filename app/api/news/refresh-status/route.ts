import { NextResponse } from "next/server";
import {
  newsSnapshotStorage,
  snapshotStorageStatus
} from "@/lib/news/snapshotStorage";
import { safeRefreshErrorMessage } from "@/lib/news/refreshErrors";
import { getNextRefreshAt, REFRESH_TIME_ZONE } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const configuredCronSchedules = ["0 11 * * *", "0 12 * * *"];

export async function GET() {
  const lastRefresh = await newsSnapshotStorage.readLastRefresh();
  const storage = snapshotStorageStatus();
  const errors = lastRefresh.errors ?? [];
  const failedSources = lastRefresh.failedSources ?? lastRefresh.debug?.failedSources ?? [];

  return NextResponse.json({
    lastRefreshStartedAt: lastRefresh.lastRefreshStartedAt ?? null,
    lastRefreshCompletedAt:
      lastRefresh.lastRefreshCompletedAt ?? lastRefresh.refreshedAt ?? null,
    lastRefreshDateAmericaNewYork:
      lastRefresh.lastRefreshDateAmericaNewYork ?? null,
    status: lastRefresh.status,
    message: lastRefresh.message ?? null,
    candidatesFound: lastRefresh.itemsFound ?? lastRefresh.candidateCount ?? 0,
    finalSelectedItems:
      lastRefresh.itemsSelected ??
      Object.values(lastRefresh.categoryCounts ?? {}).reduce((sum, count) => sum + count, 0),
    failedSources,
    lastSafeErrorMessage: errors.length
      ? safeRefreshErrorMessage(errors[errors.length - 1])
      : null,
    errors,
    nextRefreshAt: getNextRefreshAt().toISOString(),
    timeZone: REFRESH_TIME_ZONE,
    configuredCronSchedules,
    nextScheduled7AmRefreshConfigured:
      configuredCronSchedules.includes("0 11 * * *") &&
      configuredCronSchedules.includes("0 12 * * *"),
    persistentStorageConfigured: storage.persistentStorageConfigured,
    storageBackend: storage.storageBackend
  });
}
