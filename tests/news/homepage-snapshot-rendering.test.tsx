import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import type { CategoryId } from "@/config/categories";
import type { DailyNews, LastRefresh, NewsItem } from "@/types/news";

const fileStorageMock = vi.hoisted(() => ({
  readDailyNews: vi.fn(),
  readGallery: vi.fn(),
  readLastRefresh: vi.fn()
}));

vi.mock("@/lib/storage", () => ({
  fileStorage: fileStorageMock
}));

vi.mock("@/components/StickyHeader", () => ({
  default: () => <header>StickyHeader</header>
}));

vi.mock("@/components/HeroTitle", () => ({
  default: () => <div>HeroTitle</div>
}));

vi.mock("@/components/Countdown", () => ({
  default: () => <div>Countdown</div>
}));

vi.mock("@/components/BrandWordmark", () => ({
  default: () => <span>TechEveryday</span>
}));

vi.mock("@/components/CategorySection", () => ({
  default: ({
    category,
    items
  }: {
    category: { id: CategoryId; title: string };
    items: NewsItem[];
  }) => (
    <section data-testid={`category-${category.id}`}>
      {items.map((item) => (
        <article key={item.id}>{item.title}</article>
      ))}
    </section>
  )
}));

function snapshotItem(index: number): NewsItem {
  return {
    id: `stored-ai-${index}`,
    title: `Stored AI educational article ${index}`,
    summary:
      "A technical educational writeup with model architecture, benchmark evidence, implementation detail, and engineering tradeoffs.",
    url: `https://example.com/stored-ai-${index}`,
    canonicalUrl: `https://example.com/stored-ai-${index}`,
    sourceName: `Example AI ${index}`,
    sourceType: "official",
    category: "ai-ml",
    publishedAt: "2026-06-01T12:00:00.000Z",
    foundAt: "2026-06-01T12:30:00.000Z",
    imageUrl: "data:image/svg+xml,placeholder",
    trustScore: 0.9,
    freshnessScore: 0,
    technicalDepthScore: 4,
    educationalScore: 4,
    practicalUsefulnessScore: 4,
    noveltyScore: 0,
    finalScore: 4.2,
    saved: false,
    tags: ["ai", "architecture", "benchmark"],
    keyClaims: ["A technical AI system changed."],
    whyItMatters: "It helps readers understand an engineering change."
  };
}

describe("homepage snapshot rendering", () => {
  it("does not reapply the 72-hour filter or truncate a stored section below four items", async () => {
    vi.stubGlobal("React", React);
    const categories = createCategoryRecord(() => [] as NewsItem[]);
    categories["ai-ml"] = [1, 2, 3, 4].map(snapshotItem);
    const dailyNews: DailyNews = {
      refreshedAt: "2026-06-12T12:00:00.000Z",
      timezone: "America/New_York",
      categories
    };
    const lastRefresh: LastRefresh = {
      refreshedAt: dailyNews.refreshedAt,
      nextRefreshAt: "2026-06-13T11:00:00.000Z",
      candidateCount: 4,
      categoryCounts: createCategoryRecord((categoryId) =>
        categoryId === "ai-ml" ? 4 : 0
      ),
      status: "success"
    };
    fileStorageMock.readDailyNews.mockResolvedValue(dailyNews);
    fileStorageMock.readGallery.mockResolvedValue([]);
    fileStorageMock.readLastRefresh.mockResolvedValue(lastRefresh);

    const { default: HomePage } = await import("@/app/page");
    render(await HomePage());

    const aiSection = screen.getByTestId("category-ai-ml");
    expect(within(aiSection).getAllByRole("article")).toHaveLength(4);
    expect(within(aiSection).getByText("Stored AI educational article 4")).toBeInTheDocument();
  });
});
