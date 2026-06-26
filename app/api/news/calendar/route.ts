import { NextRequest, NextResponse } from "next/server";
import { archiveMetadata, isCalendarDate } from "@/lib/news/calendar";
import { newsSnapshotStorage } from "@/lib/news/snapshotStorage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get("date");

  if (date && !isCalendarDate(date)) {
    return NextResponse.json({ error: "Invalid calendar date." }, { status: 400 });
  }

  if (date) {
    const snapshot = await newsSnapshotStorage.readArchiveSnapshot(date);
    return NextResponse.json({ date, snapshot });
  }

  const [archiveDates, lastRefresh] = await Promise.all([
    newsSnapshotStorage.listArchiveSnapshots(),
    newsSnapshotStorage.readLastRefresh()
  ]);
  const dates = [...archiveDates].sort((left, right) =>
    right.date.localeCompare(left.date)
  );

  return NextResponse.json({
    dates,
    ...archiveMetadata(
      dates,
      lastRefresh.lastRefreshDateAmericaNewYork ?? null
    )
  });
}
