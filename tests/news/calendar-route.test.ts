import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import type { ArchiveSnapshot, ArchiveSnapshotSummary } from "@/types/news";

const listArchiveSnapshots = vi.hoisted(() => vi.fn());
const readArchiveSnapshot = vi.hoisted(() => vi.fn());
const readLastRefresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/news/snapshotStorage", () => ({
  newsSnapshotStorage: {
    listArchiveSnapshots,
    readArchiveSnapshot,
    readLastRefresh
  }
}));

import { GET } from "@/app/api/news/calendar/route";

const summaries: ArchiveSnapshotSummary[] = [
  {
    date: "2026-06-25",
    itemCount: 8,
    sectionCounts: createCategoryRecord(() => 0),
    updatedAt: "2026-06-25T11:00:00.000Z"
  },
  {
    date: "2026-06-24",
    itemCount: 7,
    sectionCounts: createCategoryRecord(() => 0),
    updatedAt: "2026-06-24T11:00:00.000Z"
  }
];

describe("calendar news API", () => {
  beforeEach(() => {
    listArchiveSnapshots.mockReset();
    readArchiveSnapshot.mockReset();
    readLastRefresh.mockReset();
    listArchiveSnapshots.mockResolvedValue(summaries);
    readLastRefresh.mockResolvedValue({
      lastRefreshDateAmericaNewYork: "2026-06-25"
    });
  });

  it("lists refresh dates and archive metadata", async () => {
    const response = await GET(
      new NextRequest("https://techeveryday.example/api/news/calendar")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      dates: summaries,
      availableArchiveDatesCount: 2,
      latestSnapshotDate: "2026-06-25",
      latestHistoricalSnapshotDate: "2026-06-25"
    });
  });

  it("returns an exact dated snapshot", async () => {
    const snapshot = {
      ...summaries[0],
      dailyNews: {
        refreshedAt: "2026-06-25T11:00:00.000Z",
        timezone: "America/New_York",
        categories: createCategoryRecord(() => [])
      },
      lastRefresh: {
        refreshedAt: "2026-06-25T11:00:00.000Z",
        nextRefreshAt: "2026-06-26T11:00:00.000Z",
        candidateCount: 8,
        categoryCounts: createCategoryRecord(() => 0),
        status: "success"
      }
    } satisfies ArchiveSnapshot;
    readArchiveSnapshot.mockResolvedValue(snapshot);

    const response = await GET(
      new NextRequest(
        "https://techeveryday.example/api/news/calendar?date=2026-06-25"
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      date: "2026-06-25",
      snapshot
    });
  });

  it("returns a successful empty result for a valid missing date", async () => {
    readArchiveSnapshot.mockResolvedValue(null);

    const response = await GET(
      new NextRequest(
        "https://techeveryday.example/api/news/calendar?date=2026-06-23"
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      date: "2026-06-23",
      snapshot: null
    });
  });

  it("rejects malformed and impossible dates", async () => {
    const malformed = await GET(
      new NextRequest("https://techeveryday.example/api/news/calendar?date=06-25-2026")
    );
    const impossible = await GET(
      new NextRequest("https://techeveryday.example/api/news/calendar?date=2026-02-30")
    );

    expect(malformed.status).toBe(400);
    expect(impossible.status).toBe(400);
  });
});
