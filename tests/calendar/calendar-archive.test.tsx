import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import CalendarArchive from "@/components/CalendarArchive";
import type {
  ArchiveSnapshot,
  ArchiveSnapshotSummary,
  NewsItem
} from "@/types/news";

vi.mock("@/components/NewsCard", () => ({
  default: ({ item }: { item: NewsItem }) => (
    <article>
      <h3>{item.title}</h3>
      <p>{item.whyItMatters}</p>
    </article>
  )
}));

const oldItem = {
  id: "old-archive-item",
  title: "Archived kernel scheduler deep dive",
  summary: "A stored systems explanation.",
  url: "https://example.com/kernel",
  canonicalUrl: "https://example.com/kernel",
  sourceName: "Systems Engineering",
  sourceType: "official",
  category: "computer-systems",
  publishedAt: "2026-05-01T11:00:00.000Z",
  foundAt: "2026-05-01T11:00:00.000Z",
  trustScore: 0.9,
  freshnessScore: 4,
  technicalDepthScore: 5,
  educationalScore: 5,
  practicalUsefulnessScore: 4,
  noveltyScore: 0,
  finalScore: 4.8,
  saved: false,
  tags: ["kernel"],
  keyClaims: [],
  whyItMatters: "This exact stored explanation must remain visible."
} satisfies NewsItem;

function archiveFixture(): {
  summaries: ArchiveSnapshotSummary[];
  snapshot: ArchiveSnapshot;
} {
  const categories = createCategoryRecord(() => [] as NewsItem[]);
  categories["computer-systems"] = [oldItem];
  const summary = {
    date: "2026-05-01",
    itemCount: 1,
    sectionCounts: createCategoryRecord(
      (categoryId) => categories[categoryId].length
    ),
    updatedAt: "2026-05-01T11:05:00.000Z"
  };

  return {
    summaries: [
      summary,
      {
        ...summary,
        date: "2026-04-30",
        updatedAt: "2026-04-30T11:05:00.000Z"
      }
    ],
    snapshot: {
      ...summary,
      dailyNews: {
        refreshedAt: "2026-05-01T11:00:00.000Z",
        timezone: "America/New_York",
        categories
      },
      lastRefresh: {
        refreshedAt: "2026-05-01T11:00:00.000Z",
        nextRefreshAt: "2026-05-02T11:00:00.000Z",
        candidateCount: 1,
        categoryCounts: summary.sectionCounts,
        status: "success"
      }
    }
  };
}

describe("CalendarArchive", () => {
  it("shows dates, section counts, and old stored articles without freshness filtering", () => {
    const { summaries, snapshot } = archiveFixture();

    render(
      <CalendarArchive
        summaries={summaries}
        selectedDate="2026-05-01"
        snapshot={snapshot}
        gallery={[]}
      />
    );

    expect(screen.getByRole("link", { name: /May 1, 2026/i })).toHaveAttribute(
      "href",
      "/calendar?date=2026-05-01"
    );
    expect(screen.getByRole("link", { name: /April 30, 2026/i })).toBeInTheDocument();
    expect(screen.getByText("Archived kernel scheduler deep dive")).toBeInTheDocument();
    expect(
      screen.getByText("This exact stored explanation must remain visible.")
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Computer Systems · 1/)).toHaveLength(2);
  });

  it("renders a clean empty state for a date without a refresh", () => {
    render(
      <CalendarArchive
        summaries={archiveFixture().summaries}
        selectedDate="2026-04-29"
        snapshot={null}
        gallery={[]}
      />
    );

    expect(screen.getByText(/No refresh was stored for April 29, 2026/i)).toBeInTheDocument();
  });
});
