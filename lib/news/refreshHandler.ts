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
import { safeRefreshErrorMessage } from "@/lib/news/refreshErrors";
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

  return "";
}

function hasValidSecret(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  return Boolean(expected && requestSecret(request) === expected);
}

function missingCronSecretInProduction() {
  return Boolean(process.env.NODE_ENV === "production" && !process.env.CRON_SECRET?.trim());
}

function isAuthorized(request: NextRequest, options: RefreshHandlerOptions) {
  const force = request.nextUrl.searchParams.get("force") === "true";

  if (force) {
    return hasValidSecret(request);
  }

  if (hasValidSecret(request)) {
    return true;
  }

  void options.allowVercelCron;

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
    ok: true,
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

  if (missingCronSecretInProduction()) {
    return NextResponse.json(
      {
        ok: false,
        status: "error",
        message: "Missing CRON_SECRET. Add it to Vercel Production environment variables."
      },
      { status: 500 }
    );
  }

  if (!isAuthorized(request, options)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized refresh request." },
      { status: 401 }
    );
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
        ok: false,
        status: "error",
        message:
          "Persistent news storage is not configured. Add Supabase env vars and apply the newsletter_snapshots and refresh_runs migrations before running production refresh."
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
    options.revalidate("/calendar");

    return NextResponse.json({
      ok: true,
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
      failedSources: result.failedSources,
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
    const message = safeRefreshErrorMessage(error);
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
      failedSources: [],
      trigger,
      categoryCounts: lastRefresh.categoryCounts ?? emptyCategoryCounts(),
      status: "error",
      message
    });

    return NextResponse.json({ ok: false, status: "error", message }, { status: 500 });
  }
}
