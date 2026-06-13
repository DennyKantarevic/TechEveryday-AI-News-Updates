import { describe, expect, it } from "vitest";
import {
  getAmericaNewYorkDateKey,
  getRefreshCronDecision
} from "@/lib/news/refreshSchedule";
import type { LastRefresh } from "@/types/news";

function lastRefresh(overrides: Partial<LastRefresh> = {}): LastRefresh {
  return {
    refreshedAt: null,
    nextRefreshAt: "2026-06-14T11:00:00.000Z",
    candidateCount: 0,
    categoryCounts: {} as LastRefresh["categoryCounts"],
    status: "skipped",
    ...overrides
  };
}

describe("refresh cron scheduling", () => {
  it("formats New York calendar dates independent of UTC day boundaries", () => {
    expect(getAmericaNewYorkDateKey(new Date("2026-06-13T03:30:00.000Z"))).toBe(
      "2026-06-12"
    );
    expect(getAmericaNewYorkDateKey(new Date("2026-06-13T11:00:00.000Z"))).toBe(
      "2026-06-13"
    );
  });

  it("runs at 11:00 UTC during daylight saving time", () => {
    expect(
      getRefreshCronDecision({
        now: new Date("2026-06-13T11:00:00.000Z"),
        lastRefresh: lastRefresh()
      })
    ).toMatchObject({ shouldRun: true, dateKey: "2026-06-13" });
  });

  it("runs at 12:00 UTC during standard time", () => {
    expect(
      getRefreshCronDecision({
        now: new Date("2026-12-13T12:00:00.000Z"),
        lastRefresh: lastRefresh()
      })
    ).toMatchObject({ shouldRun: true, dateKey: "2026-12-13" });
  });

  it("skips scheduled calls outside 7AM America/New_York", () => {
    expect(
      getRefreshCronDecision({
        now: new Date("2026-06-13T12:00:00.000Z"),
        lastRefresh: lastRefresh()
      })
    ).toEqual({
      shouldRun: false,
      skipped: true,
      reason: "Not 7AM America/New_York",
      dateKey: "2026-06-13"
    });
  });

  it("skips if the New York day has already refreshed", () => {
    expect(
      getRefreshCronDecision({
        now: new Date("2026-06-13T11:00:00.000Z"),
        lastRefresh: lastRefresh({
          refreshedAt: "2026-06-13T11:00:00.000Z",
          lastRefreshDateAmericaNewYork: "2026-06-13"
        })
      })
    ).toEqual({
      shouldRun: false,
      skipped: true,
      reason: "Already refreshed today",
      dateKey: "2026-06-13"
    });
  });
});
