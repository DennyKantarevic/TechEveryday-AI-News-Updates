import { NextRequest, NextResponse } from "next/server";
import { emptyCategoryCounts, refreshNews } from "@/lib/news/refreshPipeline";
import { fileStorage } from "@/lib/storage";
import {
  getNextRefreshAt,
  isSameZonedDay,
  isScheduledRefreshWindow
} from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function isAuthorized(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected && process.env.NODE_ENV === "development") {
    return true;
  }

  return Boolean(expected) && requestSecret(request) === expected;
}

async function handleRefresh(request: NextRequest) {
  const now = new Date();

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized refresh request." }, { status: 401 });
  }

  const scheduled = request.nextUrl.searchParams.get("scheduled") === "1";
  const lastRefresh = await fileStorage.readLastRefresh();
  const alreadyRefreshedToday =
    lastRefresh.refreshedAt &&
    isSameZonedDay(new Date(lastRefresh.refreshedAt), now);

  if (scheduled && (!isScheduledRefreshWindow(now) || alreadyRefreshedToday)) {
    return NextResponse.json({
      status: "skipped",
      message:
        "Scheduled call accepted but skipped because it is outside the 7:00 AM America/New_York window or today already refreshed.",
      nextRefreshAt: getNextRefreshAt(now).toISOString()
    });
  }

  try {
    const result = await refreshNews({ now });
    return NextResponse.json({
      status: "success",
      refreshedAt: result.dailyNews.refreshedAt,
      candidateCount: result.candidateCount,
      sourceBreakdown: result.sourceBreakdown,
      categoryCounts: Object.fromEntries(
        Object.entries(result.dailyNews.categories).map(([categoryId, items]) => [
          categoryId,
          items.length
        ])
      )
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown refresh error.";
    await fileStorage.writeLastRefresh({
      refreshedAt: lastRefresh.refreshedAt,
      nextRefreshAt: getNextRefreshAt(now).toISOString(),
      candidateCount: 0,
      categoryCounts: lastRefresh.categoryCounts ?? emptyCategoryCounts(),
      status: "error",
      message
    });

    return NextResponse.json({ status: "error", message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleRefresh(request);
}

export async function POST(request: NextRequest) {
  return handleRefresh(request);
}
