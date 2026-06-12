import { describe, expect, it } from "vitest";
import { getNextRefreshAt, isSameZonedDay } from "@/lib/time";

describe("refresh timezone helpers", () => {
  it("returns 7 AM America/New_York on the same day before refresh time", () => {
    const now = new Date("2026-06-11T10:00:00.000Z");
    expect(getNextRefreshAt(now).toISOString()).toBe("2026-06-11T11:00:00.000Z");
  });

  it("returns the next day at 7 AM America/New_York after refresh time", () => {
    const now = new Date("2026-12-11T14:00:00.000Z");
    expect(getNextRefreshAt(now).toISOString()).toBe("2026-12-12T12:00:00.000Z");
  });

  it("compares calendar days in America/New_York, not UTC", () => {
    expect(
      isSameZonedDay(
        new Date("2026-06-11T03:30:00.000Z"),
        new Date("2026-06-10T15:00:00.000Z")
      )
    ).toBe(true);
  });
});
