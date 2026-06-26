import { ChevronLeft, ChevronRight } from "lucide-react";
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

function dateHref(date: string) {
  return `/calendar?date=${date}`;
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
      <section
        aria-label="Refresh date selector"
        className="border-2 border-ink bg-bone p-3 shadow-[5px_5px_0_#111] sm:p-5"
      >
        {selectedDate ? (
          <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2 sm:grid-cols-[3.25rem_minmax(0,1fr)_3.25rem] sm:gap-4">
            {previousSummary ? (
              <Link
                href={dateHref(previousSummary.date)}
                aria-label={`Previous archived date, ${formatDate(previousSummary.date)}`}
                className="calendar-date-arrow flex aspect-square items-center justify-center border-2 border-ink bg-white shadow-[3px_3px_0_#111] hover:bg-brass"
              >
                <ChevronLeft aria-hidden="true" size={22} strokeWidth={2.75} />
              </Link>
            ) : (
              <span className="aspect-square" aria-hidden="true" />
            )}

            <div
              aria-label="Selected refresh date"
              className="calendar-date-wheel min-w-0 text-center"
            >
              <p className="text-xs font-black uppercase tracking-[0.2em] text-clay">
                Selected refresh
              </p>
              <p className="mx-auto mt-2 max-w-full break-words font-display text-3xl font-black leading-none sm:text-4xl md:text-5xl">
                {formatDate(selectedDate)}
              </p>
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-ink/65">
                {selectedItemCount} archived items
              </p>
            </div>

            {nextSummary ? (
              <Link
                href={dateHref(nextSummary.date)}
                aria-label={`Next archived date, ${formatDate(nextSummary.date)}`}
                className="calendar-date-arrow flex aspect-square items-center justify-center border-2 border-ink bg-white shadow-[3px_3px_0_#111] hover:bg-brass"
              >
                <ChevronRight aria-hidden="true" size={22} strokeWidth={2.75} />
              </Link>
            ) : (
              <span className="aspect-square" aria-hidden="true" />
            )}
          </div>
        ) : null}

        {sortedSummaries.length ? (
          <nav
            aria-label="Available refresh dates"
            className="mt-5 flex flex-wrap justify-center gap-2"
          >
            {sortedSummaries.map((summary) => {
              const selected = summary.date === selectedDate;
              return (
                <Link
                  key={summary.date}
                  href={dateHref(summary.date)}
                  aria-current={selected ? "date" : undefined}
                  className={`max-w-full border-2 border-ink px-3 py-2 text-center transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#111] ${
                    selected ? "bg-ink text-white" : "bg-white"
                  }`}
                >
                  <span className="block truncate font-display text-sm font-black sm:text-base">
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
          <p className="border-2 border-dashed border-ink bg-bone p-4 text-sm leading-6">
            No refresh dates are available yet.
          </p>
        )}
      </section>

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

      <style>{`
        .calendar-date-wheel {
          animation: calendar-date-wheel-spin 240ms cubic-bezier(0.2, 0.8, 0.2, 1);
          transform-origin: 50% 50%;
        }

        .calendar-date-arrow {
          transition:
            background-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .calendar-date-arrow:hover {
          transform: translateY(-1px) rotate(-2deg);
        }

        @keyframes calendar-date-wheel-spin {
          from {
            opacity: 0;
            transform: perspective(500px) rotateX(-16deg) translateY(8px);
          }

          to {
            opacity: 1;
            transform: perspective(500px) rotateX(0deg) translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .calendar-date-wheel {
            animation: none;
          }

          .calendar-date-arrow {
            transition: none;
          }

          .calendar-date-arrow:hover {
            transform: none;
          }
        }
      `}</style>
    </div>
  );
}
