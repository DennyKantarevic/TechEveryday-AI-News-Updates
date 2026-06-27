"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import React, { useCallback, useEffect, useRef } from "react";
import type { ArchiveSnapshotSummary } from "@/types/news";

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

function setCardMotion(card: HTMLElement, progress: number) {
  const clampedProgress = Math.max(-1, Math.min(1, progress));
  const distance = Math.abs(clampedProgress);

  card.style.setProperty("--calendar-shift", `${(-clampedProgress * 5).toFixed(2)}px`);
  card.style.setProperty("--calendar-depth", `${((1 - distance) * 8).toFixed(2)}px`);
  card.style.setProperty("--calendar-tilt", `${(-clampedProgress * 3.2).toFixed(2)}deg`);
  card.style.setProperty("--calendar-rotate", `${(clampedProgress * 1.15).toFixed(2)}deg`);
  card.style.setProperty("--calendar-opacity", `${(1 - distance * 0.1).toFixed(3)}`);
}

function resetCardMotion(card: HTMLElement) {
  card.style.setProperty("--calendar-shift", "0px");
  card.style.setProperty("--calendar-depth", "0px");
  card.style.setProperty("--calendar-tilt", "0deg");
  card.style.setProperty("--calendar-rotate", "0deg");
  card.style.setProperty("--calendar-opacity", "1");
}

export default function CalendarDateSelector({
  summaries,
  selectedDate,
  previousSummary,
  nextSummary
}: {
  summaries: ArchiveSnapshotSummary[];
  selectedDate: string | null;
  previousSummary: ArchiveSnapshotSummary | null;
  nextSummary: ArchiveSnapshotSummary | null;
}) {
  const railRef = useRef<HTMLElement | null>(null);

  const updateCardMotion = useCallback((reducedMotion = false) => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const cards = Array.from(
      rail.querySelectorAll<HTMLElement>("[data-calendar-date-card]")
    );

    if (reducedMotion) {
      cards.forEach(resetCardMotion);
      return;
    }

    const railRect = rail.getBoundingClientRect();
    const railCenter = railRect.left + railRect.width / 2;
    const halfRange = Math.max(railRect.width / 2, 1);

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      setCardMotion(card, (cardCenter - railCenter) / halfRange);
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const selectedCard = rail.querySelector<HTMLElement>('[aria-current="date"]');

    if (!selectedCard) {
      return;
    }

    const left = Math.max(
      0,
      selectedCard.offsetLeft - (rail.clientWidth - selectedCard.offsetWidth) / 2
    );

    if (typeof rail.scrollTo === "function") {
      rail.scrollTo({ left, behavior: "auto" });
    } else {
      rail.scrollLeft = left;
    }
  }, [selectedDate, summaries.length]);

  useEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    let frame = 0;
    const reducedMotionQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;

    const scheduleUpdate = () => {
      if (frame) {
        return;
      }

      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateCardMotion(Boolean(reducedMotionQuery?.matches));
      });
    };

    const handleReducedMotionChange = () => {
      updateCardMotion(Boolean(reducedMotionQuery?.matches));
    };

    scheduleUpdate();
    rail.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);
    reducedMotionQuery?.addEventListener?.("change", handleReducedMotionChange);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      rail.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      reducedMotionQuery?.removeEventListener?.("change", handleReducedMotionChange);
    };
  }, [summaries.length, selectedDate, updateCardMotion]);

  return (
    <section
      aria-label="Refresh date selector"
      className="border-2 border-ink bg-bone p-3 shadow-[5px_5px_0_#111] sm:p-5"
    >
      {selectedDate ? (
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {previousSummary ? (
            <Link
              href={dateHref(previousSummary.date)}
              aria-label={`Previous archived date, ${formatDate(previousSummary.date)}`}
              className="calendar-date-arrow flex aspect-square items-center justify-center border-2 border-ink bg-white shadow-[3px_3px_0_#111] hover:bg-brass"
            >
              <ChevronLeft
                aria-hidden="true"
                className="calendar-date-arrow-icon"
                size={22}
                strokeWidth={2.75}
              />
            </Link>
          ) : (
            <span className="aspect-square" aria-hidden="true" />
          )}

          {nextSummary ? (
            <Link
              href={dateHref(nextSummary.date)}
              aria-label={`Next archived date, ${formatDate(nextSummary.date)}`}
              className="calendar-date-arrow flex aspect-square items-center justify-center border-2 border-ink bg-white shadow-[3px_3px_0_#111] hover:bg-brass"
            >
              <ChevronRight
                aria-hidden="true"
                className="calendar-date-arrow-icon"
                size={22}
                strokeWidth={2.75}
              />
            </Link>
          ) : (
            <span className="aspect-square" aria-hidden="true" />
          )}
        </div>
      ) : null}

      {summaries.length ? (
        <nav
          ref={railRef}
          aria-label="Available refresh dates"
          className="calendar-date-rail -mx-3 mt-5 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-3 pb-3 pt-1 sm:-mx-5 sm:gap-3 sm:px-5"
        >
          {summaries.map((summary) => {
            const selected = summary.date === selectedDate;
            return (
              <Link
                key={summary.date}
                href={dateHref(summary.date)}
                aria-current={selected ? "date" : undefined}
                data-calendar-date-card
                className={`calendar-date-card max-w-[74vw] flex-none border-2 border-ink px-3 py-2 text-center outline-offset-4 ${
                  selected
                    ? "calendar-date-card-current bg-ink text-white"
                    : "bg-white text-ink"
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

      <style>{`
        .calendar-date-arrow {
          transition:
            background-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .calendar-date-arrow-icon {
          transform: translateY(1.5px);
        }

        .calendar-date-arrow:hover {
          transform: translateY(-1px) rotate(-2deg);
        }

        .calendar-date-rail {
          -webkit-overflow-scrolling: touch;
          perspective: 900px;
          scrollbar-color: rgba(17, 17, 17, 0.55) transparent;
          scrollbar-width: thin;
          transform-style: preserve-3d;
        }

        .calendar-date-rail::-webkit-scrollbar {
          height: 0.5rem;
        }

        .calendar-date-rail::-webkit-scrollbar-track {
          background: transparent;
        }

        .calendar-date-rail::-webkit-scrollbar-thumb {
          background: rgba(17, 17, 17, 0.38);
          border-radius: 999px;
        }

        .calendar-date-card {
          min-width: min(11rem, 74vw);
          opacity: var(--calendar-opacity, 1);
          transform:
            translate3d(var(--calendar-shift, 0px), 0, var(--calendar-depth, 0px))
            rotateY(var(--calendar-tilt, 0deg))
            rotateZ(var(--calendar-rotate, 0deg));
          transform-origin: 50% 65%;
          transition:
            background-color 160ms ease,
            box-shadow 160ms ease,
            color 160ms ease,
            opacity 180ms ease,
            transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
          will-change: transform;
        }

        .calendar-date-card:hover,
        .calendar-date-card:focus-visible {
          box-shadow: 4px 4px 0 #111;
          transform:
            translate3d(var(--calendar-shift, 0px), -2px, var(--calendar-depth, 0px))
            rotateY(var(--calendar-tilt, 0deg))
            rotateZ(var(--calendar-rotate, 0deg));
        }

        .calendar-date-card-current {
          box-shadow: 4px 4px 0 #111;
        }

        @media (prefers-reduced-motion: reduce) {
          .calendar-date-arrow,
          .calendar-date-card {
            transition: none;
          }

          .calendar-date-arrow:hover {
            transform: none;
          }

          .calendar-date-card,
          .calendar-date-card:hover,
          .calendar-date-card:focus-visible {
            opacity: 1;
            transform: none;
            will-change: auto;
          }
        }
      `}</style>
    </section>
  );
}
