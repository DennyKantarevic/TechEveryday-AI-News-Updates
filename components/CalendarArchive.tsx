import Link from "next/link";
import React from "react";
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
  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-clay">
          Refresh dates
        </p>
        {summaries.length ? (
          <nav
            aria-label="Available refresh dates"
            className="mt-4 flex gap-3 overflow-x-auto pb-3 lg:flex-col lg:overflow-visible"
          >
            {summaries.map((summary) => {
              const selected = summary.date === selectedDate;
              return (
                <Link
                  key={summary.date}
                  href={`/calendar?date=${summary.date}`}
                  aria-current={selected ? "date" : undefined}
                  className={`min-w-44 border-2 border-ink px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111] lg:min-w-0 ${
                    selected ? "bg-ink text-white" : "bg-white"
                  }`}
                >
                  <span className="block font-display text-lg font-black">
                    {formatDate(summary.date)}
                  </span>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-[0.12em]">
                    {summary.itemCount} items
                  </span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <p className="mt-4 border-2 border-dashed border-ink bg-bone p-4 text-sm leading-6">
            No refresh dates are available yet.
          </p>
        )}
      </aside>

      <div className="min-w-0">
        {selectedDate ? (
          <div className="border-b-2 border-ink pb-6">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-brass">
              Selected refresh
            </p>
            <h2 className="mt-2 font-display text-4xl font-black leading-none md:text-6xl">
              {formatDate(selectedDate)}
            </h2>
            <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-ink/65">
              {snapshot?.itemCount ?? 0} archived items
            </p>
          </div>
        ) : null}

        {!snapshot ? (
          <div className="mt-8 border-2 border-dashed border-ink bg-bone p-8 text-center shadow-[5px_5px_0_#111]">
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
