"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState
} from "react";
import type { ArchiveSnapshotSummary } from "@/types/news";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${date}T12:00:00.000Z`));
}

function dateHref(date: string, selectorPreview: boolean) {
  return selectorPreview
    ? `/calendar?date=${date}&preview=selector`
    : `/calendar?date=${date}`;
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

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export default function CalendarDateSelector({
  summaries,
  selectedDate,
  selectorPreview = false
}: {
  summaries: ArchiveSnapshotSummary[];
  selectedDate: string | null;
  selectorPreview?: boolean;
}) {
  const railRef = useRef<HTMLElement | null>(null);
  const [scrollState, setScrollState] = useState({
    canScrollLeft: false,
    canScrollRight: false
  });

  const updateRailEdgePadding = useCallback(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const selectedCard =
      rail.querySelector<HTMLElement>('[aria-current="date"]') ??
      rail.querySelector<HTMLElement>("[data-calendar-date-card]");

    if (!selectedCard) {
      return;
    }

    const startPadding = 52;
    rail.style.setProperty("--calendar-rail-start-padding", `${startPadding}px`);
    rail.style.setProperty("--calendar-rail-end-padding", "0px");
  }, []);

  const updateScrollState = useCallback(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const nextState = {
      canScrollLeft: rail.scrollLeft > 2,
      canScrollRight: rail.scrollLeft < maxScrollLeft - 2
    };

    setScrollState((currentState) =>
      currentState.canScrollLeft === nextState.canScrollLeft &&
      currentState.canScrollRight === nextState.canScrollRight
        ? currentState
        : nextState
    );
  }, []);

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

  const alignSelectedDateLeft = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const rail = railRef.current;

      if (!rail) {
        return;
      }

      const selectedCard = rail.querySelector<HTMLElement>('[aria-current="date"]');

      if (!selectedCard) {
        return;
      }

      updateRailEdgePadding();

      const startPadding = Number.parseFloat(
        rail.style.getPropertyValue("--calendar-rail-start-padding")
      );
      const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
      const left = Math.max(
        0,
        Math.min(
          selectedCard.offsetLeft - (Number.isNaN(startPadding) ? 52 : startPadding),
          maxScrollLeft
        )
      );

      if (typeof rail.scrollTo === "function") {
        rail.scrollTo({ left, behavior });
      } else {
        rail.scrollLeft = left;
      }

      updateScrollState();
    },
    [updateRailEdgePadding, updateScrollState]
  );

  const scrollRailByPage = useCallback(
    (direction: -1 | 1) => {
      const rail = railRef.current;

      if (!rail) {
        return;
      }

      updateRailEdgePadding();

      const distance = Math.max(rail.clientWidth * 0.72, 220);

      if (typeof rail.scrollBy === "function") {
        rail.scrollBy({
          left: direction * distance,
          behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
      } else {
        rail.scrollLeft += direction * distance;
      }
    },
    [updateRailEdgePadding]
  );

  useLayoutEffect(() => {
    const rail = railRef.current;

    if (!rail) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      alignSelectedDateLeft("auto");
      updateCardMotion(prefersReducedMotion());
    });

    return () => window.cancelAnimationFrame(frame);
  }, [alignSelectedDateLeft, selectedDate, summaries.length, updateCardMotion]);

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
        updateRailEdgePadding();
        updateCardMotion(Boolean(reducedMotionQuery?.matches));
        updateScrollState();
      });
    };

    const handleReducedMotionChange = () => {
      updateCardMotion(Boolean(reducedMotionQuery?.matches));
    };

    scheduleUpdate();
    const handleResize = () => {
      alignSelectedDateLeft("auto");
      scheduleUpdate();
    };

    rail.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", handleResize);
    reducedMotionQuery?.addEventListener?.("change", handleReducedMotionChange);

    return () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
      }

      rail.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", handleResize);
      reducedMotionQuery?.removeEventListener?.("change", handleReducedMotionChange);
    };
  }, [
    alignSelectedDateLeft,
    summaries.length,
    selectedDate,
    updateCardMotion,
    updateRailEdgePadding,
    updateScrollState
  ]);

  return (
    <section
      aria-label="Refresh date selector"
      className="border-2 border-ink bg-bone p-3 shadow-[5px_5px_0_#111] sm:p-5"
    >
      {summaries.length ? (
        <div
          role="group"
          aria-label="Date selector rail"
          className="calendar-date-rail-shell"
        >
          <button
            type="button"
            aria-label="Scroll date selector left"
            className="calendar-date-arrow calendar-date-rail-arrow calendar-date-rail-arrow-left bg-white hover:bg-brass"
            disabled={!scrollState.canScrollLeft}
            onClick={() => scrollRailByPage(-1)}
          >
            <ChevronLeft
              aria-hidden="true"
              className="calendar-date-arrow-icon"
              size={22}
              strokeWidth={2.75}
            />
          </button>

          <nav
            ref={railRef}
            aria-label="Available refresh dates"
            className="calendar-date-rail calendar-date-rail-left calendar-date-rail-stop-at-oldest flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-4 pt-2 sm:gap-3"
          >
            {summaries.map((summary) => {
              const selected = summary.date === selectedDate;
              return (
                <Link
                  key={summary.date}
                  href={dateHref(summary.date, selectorPreview)}
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

          <button
            type="button"
            aria-label="Scroll date selector right"
            className="calendar-date-arrow calendar-date-rail-arrow calendar-date-rail-arrow-right bg-white hover:bg-brass"
            disabled={!scrollState.canScrollRight}
            onClick={() => scrollRailByPage(1)}
          >
            <ChevronRight
              aria-hidden="true"
              className="calendar-date-arrow-icon"
              size={22}
              strokeWidth={2.75}
            />
          </button>
        </div>
      ) : (
        <p className="border-2 border-dashed border-ink bg-bone p-4 text-sm leading-6">
          No refresh dates are available yet.
        </p>
      )}

      <style>{`
        .calendar-date-rail-shell {
          position: relative;
          isolation: isolate;
        }

        .calendar-date-arrow {
          transition:
            background-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .calendar-date-rail-arrow {
          align-items: center;
          border: 2px solid #111;
          box-shadow: 3px 3px 0 #111;
          color: #111;
          display: flex;
          height: 2.75rem;
          justify-content: center;
          position: absolute;
          top: 50%;
          transform: translate3d(0, -50%, 0);
          width: 2.75rem;
          z-index: 2;
        }

        .calendar-date-rail-arrow-left {
          left: 0;
        }

        .calendar-date-rail-arrow-right {
          right: 0;
        }

        .calendar-date-arrow-icon {
          transform: translateY(1.5px);
        }

        .calendar-date-rail-arrow:hover:not(:disabled) {
          transform: translate3d(0, calc(-50% - 1px), 0) rotate(-2deg);
        }

        .calendar-date-rail-arrow:disabled {
          box-shadow: none;
          cursor: not-allowed;
          opacity: 0.32;
        }

        .calendar-date-rail {
          -webkit-overflow-scrolling: touch;
          padding-inline: var(--calendar-rail-start-padding, 3.25rem)
            var(--calendar-rail-end-padding, 0);
          perspective: 900px;
          scroll-padding-inline: var(--calendar-rail-start-padding, 3.25rem)
            var(--calendar-rail-end-padding, 0);
          scroll-snap-type: x proximity;
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
          scroll-snap-align: start;
          transform:
            translate3d(var(--calendar-shift, 0px), 0, var(--calendar-depth, 0px))
            rotateY(var(--calendar-tilt, 0deg))
            rotateZ(var(--calendar-rotate, 0deg));
          transform-origin: 50% 65%;
          transition:
            background-color 160ms ease,
            box-shadow 160ms ease,
            color 160ms ease,
            opacity 180ms ease;
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

          .calendar-date-rail {
            scroll-behavior: auto;
            scroll-snap-type: none;
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
