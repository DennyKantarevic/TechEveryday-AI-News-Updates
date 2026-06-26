import { describe, expect, it } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import {
  archiveMetadata,
  isCalendarDate,
  sectionCounts,
  totalItems
} from "@/lib/news/calendar";
import type { ArchiveSnapshotSummary, DailyNews, NewsItem } from "@/types/news";

const item = {
  id: "archive-item",
  title: "Archived systems writeup",
  summary: "Stored technical summary.",
  url: "https://example.com/archive",
  canonicalUrl: "https://example.com/archive",
  sourceName: "Example Engineering",
  sourceType: "official",
  category: "computer-systems",
  publishedAt: "2026-06-20T11:00:00.000Z",
  foundAt: "2026-06-20T11:00:00.000Z",
  trustScore: 0.9,
  freshnessScore: 4,
  technicalDepthScore: 4,
  educationalScore: 4,
  practicalUsefulnessScore: 4,
  noveltyScore: 0,
  finalScore: 4.5,
  saved: false,
  tags: ["systems"],
  keyClaims: [],
  whyItMatters: "Stored archive reasoning."
} satisfies NewsItem;

describe("calendar helpers", () => {
  it("validates real calendar dates rather than only the string shape", () => {
    expect(isCalendarDate("2026-06-25")).toBe(true);
    expect(isCalendarDate("2026-02-29")).toBe(false);
    expect(isCalendarDate("2026-02-30")).toBe(false);
    expect(isCalendarDate("06-25-2026")).toBe(false);
  });

  it("counts archived items by section and in total", () => {
    const categories = createCategoryRecord(() => [] as NewsItem[]);
    categories["computer-systems"] = [item];
    categories["cloud-infrastructure"] = [
      { ...item, id: "cloud-item", category: "cloud-infrastructure" }
    ];
    const dailyNews: DailyNews = {
      refreshedAt: "2026-06-20T11:00:00.000Z",
      timezone: "America/New_York",
      categories
    };

    expect(totalItems(dailyNews)).toBe(2);
    expect(sectionCounts(dailyNews)).toMatchObject({
      "computer-systems": 1,
      "cloud-infrastructure": 1,
      "ai-ml": 0
    });
  });

  it("reports latest current and historical archive dates", () => {
    const summaries: ArchiveSnapshotSummary[] = [
      {
        date: "2026-06-24",
        itemCount: 8,
        sectionCounts: createCategoryRecord(() => 0),
        updatedAt: "2026-06-24T11:00:00.000Z"
      },
      {
        date: "2026-06-22",
        itemCount: 7,
        sectionCounts: createCategoryRecord(() => 0),
        updatedAt: "2026-06-22T11:00:00.000Z"
      }
    ];

    expect(archiveMetadata(summaries, "2026-06-25")).toEqual({
      availableArchiveDatesCount: 2,
      latestSnapshotDate: "2026-06-25",
      latestHistoricalSnapshotDate: "2026-06-24"
    });
  });
});
