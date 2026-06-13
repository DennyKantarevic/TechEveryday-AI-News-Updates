import { NextRequest, NextResponse } from "next/server";
import { getNextRefreshAt } from "@/lib/time";
import { emptyCategoryCounts, refreshNews } from "@/lib/news/refreshPipeline";
import {
  getAmericaNewYorkDateKey,
  getRefreshCronDecision,
  type RefreshCronDecision
} from "@/lib/news/refreshSchedule";
import {
  newsSnapshotStorage,
  snapshotStorageStatus
} from "@/lib/news/snapshotStorage";
import type { LastRefresh } from "@/types/news";

type RefreshHandlerOptions = {
  scheduled: boolean;
  allowVercelCron: boolean;
  revalidate: (path: string) => void;
};

function requestSecret(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice("bearer ".length).trim();
  }

  return (
    request.headers.get("x-cron-secret") ??
    request.nextUrl.searchParams.get("secret") ??
    ""
  ).trim();
}

function hasValidSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  return Boolean(expected && requestSecret(request) === expected);
}

function isVercelCronRequest(request: NextRequest) {
  return request.headers.get("user-agent")?.includes("vercel-cron/1.0") ?? false;
}

function isAuthorized(request: NextRequest, options: RefreshHandlerOptions) {
  const force = request.nextUrl.searchParams.get("force") === "true";

  if (force) {
    return hasValidSecret(request);
  }

  if (hasValidSecret(request)) {
    return true;
  }

  if (options.allowVercelCron && isVercelCronRequest(request)) {
    return true;
  }

  return Boolean(!process.env.CRON_SECRET && process.env.NODE_ENV === "development");
}

function selectedItemCount(categories: Record<string, unknown[]>) {
  return Object.values(categories).reduce((sum, items) => sum + items.length, 0);
}

async function safeWriteLastRefresh(lastRefresh: LastRefresh) {
  try {
    await newsSnapshotStorage.writeLastRefresh(lastRefresh);
  } catch (error) {
    console.error("[news:refresh] status_write_failed", {
      message: error instanceof Error ? error.message : "Unknown status write error."
    });
  }
}

function skippedResponse(decision: Extract<RefreshCronDecision, { shouldRun: false }>) {
  return NextResponse.json({
    skipped: true,
    reason: decision.reason,
    lastRefreshDateAmericaNewYork: decision.dateKey,
    nextRefreshAt: getNextRefreshAt().toISOString()
  });
}

export async function handleRefreshRequest(
  request: NextRequest,
  options: RefreshHandlerOptions
) {
  const force = request.nextUrl.searchParams.get("force") === "true";
  const now = new Date();
  const storageStatus = snapshotStorageStatus();

  if (!isAuthorized(request, options)) {
    return NextResponse.json({ error: "Unauthorized refresh request." }, { status: 401 });
  }

  const lastRefresh = await newsSnapshotStorage.readLastRefresh();
  const dateKey = getAmericaNewYorkDateKey(now);

  if (options.scheduled && !force) {
    const decision = getRefreshCronDecision({ now, lastRefresh });

    if (!decision.shouldRun) {
      return skippedResponse(decision);
    }
  }

  if (process.env.NODE_ENV === "production" && !storageStatus.persistentStorageConfigured) {
    return NextResponse.json(
      {
        status: "error",
        message:
          "Persistent news storage is not configured. Add Supabase env vars and apply the daily_news_snapshots migration before running production refresh."
      },
      { status: 500 }
    );
  }

  const startedAt = now.toISOString();
  const trigger: LastRefresh["trigger"] = force
    ? "manual"
    : options.scheduled
      ? "scheduled"
      : "api";

  await safeWriteLastRefresh({
    ...lastRefresh,
    lastRefreshStartedAt: startedAt,
    lastRefreshCompletedAt: null,
    lastRefreshDateAmericaNewYork: dateKey,
    nextRefreshAt: getNextRefreshAt(now).toISOString(),
    status: "running",
    trigger,
    message: force
      ? "Manual refresh started."
      : "Scheduled refresh started.",
    errors: []
  });

  try {
    const result = await refreshNews({
      now,
      startedAt,
      trigger,
      lastRefreshDateAmericaNewYork: dateKey
    });
    const itemsSelected = selectedItemCount(result.dailyNews.categories);

    options.revalidate("/");
    options.revalidate("/learning");
    options.revalidate("/for-you");

    return NextResponse.json({
      status: "success",
      skipped: false,
      trigger,
      refreshedAt: result.dailyNews.refreshedAt,
      lastRefreshStartedAt: startedAt,
      lastRefreshCompletedAt: result.dailyNews.refreshedAt,
      lastRefreshDateAmericaNewYork: dateKey,
      candidateCount: result.candidateCount,
      itemsFound: result.candidateCount,
      itemsSelected,
      sourceBreakdown: result.sourceBreakdown,
      debug: result.debug,
      categoryCounts: Object.fromEntries(
        Object.entries(result.dailyNews.categories).map(([categoryId, items]) => [
          categoryId,
          items.length
        ])
      )
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh error.";
    await safeWriteLastRefresh({
      refreshedAt: lastRefresh.refreshedAt,
      nextRefreshAt: getNextRefreshAt(now).toISOString(),
      lastRefreshStartedAt: startedAt,
      lastRefreshCompletedAt: new Date().toISOString(),
      lastRefreshDateAmericaNewYork: dateKey,
      candidateCount: 0,
      itemsFound: 0,
      itemsSelected: 0,
      errors: [message],
      trigger,
      categoryCounts: lastRefresh.categoryCounts ?? emptyCategoryCounts(),
      status: "error",
      message
    });

    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}
