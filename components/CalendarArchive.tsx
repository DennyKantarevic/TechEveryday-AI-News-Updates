import React from "react";
import CalendarDateSelector from "@/components/CalendarDateSelector";
import NewsCard from "@/components/NewsCard";
import { CATEGORIES } from "@/config/categories";
import { mergeSavedState } from "@/lib/news/refreshPipeline";
import type {
  ArchiveSnapshot,
  ArchiveSnapshotSummary,
  NewsItem
} from "@/types/news";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00.000Z`));
}

export default function CalendarArchive({
  summaries,
  selectedDate,
  snapshot,
  gallery
}: {
  summaries: ArchiveSnapshotSummary[];
  selectedDate: string | null;
  snapshot: ArchiveSnapshot | null;
  gallery: NewsItem[];
}) {
  const sortedSummaries = [...summaries].sort((left, right) =>
    right.date.localeCompare(left.date)
  );
  const selectedIndex = selectedDate
    ? sortedSummaries.findIndex((summary) => summary.date === selectedDate)
    : -1;
  const selectedSummary =
    selectedIndex >= 0 ? sortedSummaries[selectedIndex] : null;
  const previousSummary =
    selectedIndex >= 0 ? sortedSummaries[selectedIndex + 1] : null;
  const nextSummary = selectedIndex > 0 ? sortedSummaries[selectedIndex - 1] : null;
  const selectedItemCount = selectedSummary?.itemCount ?? snapshot?.itemCount ?? 0;

  return (
    <div className="mt-10 space-y-10">
      <CalendarDateSelector
        summaries={sortedSummaries}
        selectedDate={selectedDate}
        selectedItemCount={selectedItemCount}
        previousSummary={previousSummary}
        nextSummary={nextSummary}
      />

      <div className="min-w-0">
        {!snapshot ? (
          <div className="border-2 border-dashed border-ink bg-bone p-8 text-center shadow-[5px_5px_0_#111]">
            <p className="font-display text-2xl font-black">
              {selectedDate
                ? `No refresh was stored for ${formatDate(selectedDate)}.`
                : "No archived refresh is available yet."}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-ink/70">
              Historical snapshots appear here after a successful daily refresh.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className="border-2 border-ink bg-white px-4 py-3 shadow-[3px_3px_0_#111]"
                >
                  <p className="text-xs font-black uppercase leading-5 tracking-[0.1em]">
                    {category.title} · {snapshot.sectionCounts[category.id] ?? 0}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-14 space-y-16">
              {CATEGORIES.map((category) => {
                const items = mergeSavedState(
                  snapshot.dailyNews.categories[category.id] ?? [],
                  gallery
                );

                if (!items.length) {
                  return null;
                }

                return (
                  <section key={category.id} className="scroll-mt-28">
                    <div className="mb-7 border-b-2 border-ink pb-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-brass">
                        Archived section
                      </p>
                      <h3 className="mt-2 font-display text-3xl font-black leading-tight md:text-5xl">
                        {category.title} · {items.length}
                      </h3>
                    </div>
                    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => (
                        <NewsCard key={item.id} item={item} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
