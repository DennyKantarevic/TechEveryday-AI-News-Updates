import type { Metadata } from "next";
import CalendarArchive from "@/components/CalendarArchive";
import StickyHeader from "@/components/StickyHeader";
import { isCalendarDate } from "@/lib/news/calendar";
import { newsSnapshotStorage } from "@/lib/news/snapshotStorage";
import { fileStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Calendar - TechEveryday",
  description: "Browse TechEveryday daily refresh snapshots by date."
};

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const [params, summaries, lastRefresh, gallery] = await Promise.all([
    searchParams,
    newsSnapshotStorage.listArchiveSnapshots(),
    newsSnapshotStorage.readLastRefresh(),
    fileStorage.readGallery()
  ]);
  const requestedDate =
    typeof params.date === "string" && isCalendarDate(params.date)
      ? params.date
      : null;
  const selectedDate =
    requestedDate ??
    summaries[0]?.date ??
    lastRefresh.lastRefreshDateAmericaNewYork ??
    null;
  const snapshot = selectedDate
    ? await newsSnapshotStorage.readArchiveSnapshot(selectedDate)
    : null;

  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <section className="border-b-2 border-ink pb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
            Daily archive
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none md:text-7xl">
            Refresh calendar
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 md:text-base">
            Pick a day and revisit the stories TechEveryday saved for you.
          </p>
        </section>

        <CalendarArchive
          summaries={summaries}
          selectedDate={selectedDate}
          snapshot={snapshot}
          gallery={gallery}
        />
      </main>
    </>
  );
}
