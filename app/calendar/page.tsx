import type { Metadata } from "next";
import CalendarArchive from "@/components/CalendarArchive";
import StickyHeader from "@/components/StickyHeader";
import { isCalendarDate } from "@/lib/news/calendar";
import { newsSnapshotStorage } from "@/lib/news/snapshotStorage";
import { fileStorage } from "@/lib/storage";
import type { ArchiveSnapshotSummary } from "@/types/news";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Calendar - TechEveryday",
  description: "Browse TechEveryday daily refresh snapshots by date."
};

const selectorPreviewSectionCounts: ArchiveSnapshotSummary["sectionCounts"] = {
  "ai-ml": 5,
  "automation-agentic-systems": 5,
  "research-papers": 5,
  "embedded-systems": 5,
  "computer-systems": 5,
  "developer-tools-open-source": 4,
  "cloud-infrastructure": 4
};

const selectorPreviewSummaries: ArchiveSnapshotSummary[] = [
  "2026-06-27",
  "2026-06-26",
  "2026-06-25",
  "2026-06-24",
  "2026-06-23",
  "2026-06-22",
  "2026-06-21",
  "2026-06-20",
  "2026-06-19"
].map((date, index) => ({
  date,
  itemCount: 34 - (index % 3),
  sectionCounts: selectorPreviewSectionCounts,
  updatedAt: `${date}T11:30:00.000Z`
}));

export default async function CalendarPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string | string[]; preview?: string | string[] }>;
}) {
  const [params, summaries, lastRefresh, gallery] = await Promise.all([
    searchParams,
    newsSnapshotStorage.listArchiveSnapshots(),
    newsSnapshotStorage.readLastRefresh(),
    fileStorage.readGallery()
  ]);
  const useSelectorPreview = params.preview === "selector";
  const calendarSummaries = useSelectorPreview ? selectorPreviewSummaries : summaries;
  const requestedDate =
    typeof params.date === "string" && isCalendarDate(params.date)
      ? params.date
      : null;
  const selectedDate =
    requestedDate ??
    calendarSummaries[0]?.date ??
    lastRefresh.lastRefreshDateAmericaNewYork ??
    null;
  const snapshot = selectedDate && !useSelectorPreview
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
          summaries={calendarSummaries}
          selectedDate={selectedDate}
          snapshot={snapshot}
          gallery={gallery}
          selectorPreview={useSelectorPreview}
        />
      </main>
    </>
  );
}
