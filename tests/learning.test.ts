import { describe, expect, it } from "vitest";
import {
  LEARNING_FOUNDATIONS,
  getLearningBridges,
  getLearningCurrentContext
} from "@/lib/learning";
import { createCategoryRecord } from "@/config/categories";
import type { CategoryId } from "@/config/categories";
import type { DailyNews, NewsItem } from "@/types/news";

function article(
  id: string,
  category: CategoryId,
  publishedAt: string,
  title = `${category} story`
): NewsItem {
  return {
    id,
    title,
    summary: "A concise current story summary.",
    url: `https://example.com/${id}`,
    sourceName: "Example Source",
    sourceType: "official",
    category,
    publishedAt,
    foundAt: publishedAt,
    imageUrl: "placeholder:test",
    trustScore: 0.9,
    saved: false,
    tags: [category]
  };
}

function dailyNews(items: NewsItem[]): DailyNews {
  const categories = createCategoryRecord<NewsItem[]>(() => []);

  for (const item of items) {
    categories[item.category].push(item);
  }

  return {
    refreshedAt: "2026-06-12T07:00:00.000Z",
    timezone: "America/New_York",
    categories
  };
}

describe("learning foundations", () => {
  it("contains the required concise sections in order", () => {
    expect(LEARNING_FOUNDATIONS.map((section) => section.title)).toEqual([
      "AI / ML basics",
      "Agents and automation basics",
      "Research paper reading basics",
      "Computer systems basics",
      "Embedded systems basics",
      "Cybersecurity basics",
      "Cloud/infrastructure basics"
    ]);

    for (const section of LEARNING_FOUNDATIONS) {
      expect(section.points.length).toBeGreaterThanOrEqual(2);
      expect(section.points.length).toBeLessThanOrEqual(3);
      expect(section.bridge).toMatch(/\S/);
      expect(section.categoryIds.length).toBeGreaterThan(0);
    }
  });
});

describe("getLearningCurrentContext", () => {
  it("returns recent relevant feed items capped by limit", () => {
    const feed = dailyNews([
      article("old-ai", "ai-ml", "2026-06-09T08:00:00.000Z"),
      article("new-security", "cybersecurity", "2026-06-12T08:00:00.000Z"),
      article("tooling", "developer-tools-open-source", "2026-06-12T09:00:00.000Z"),
      article("new-cloud", "cloud-infrastructure", "2026-06-11T08:00:00.000Z")
    ]);

    expect(getLearningCurrentContext(feed, 2).map((item) => item.id)).toEqual([
      "new-security",
      "new-cloud"
    ]);
  });

  it("deduplicates articles that appear in multiple relevant categories", () => {
    const duplicated = article("same-story", "ai-ml", "2026-06-12T08:00:00.000Z");
    const feed = dailyNews([duplicated]);
    feed.categories["cloud-infrastructure"].push({
      ...duplicated,
      category: "cloud-infrastructure"
    });

    expect(getLearningCurrentContext(feed).map((item) => item.id)).toEqual(["same-story"]);
  });

  it("ignores starter placeholders when selecting current context", () => {
    const starter = {
      ...article(
        "starter-computer-systems-example",
        "computer-systems",
        "2026-06-12T09:00:00.000Z",
        "Starter source"
      ),
      tags: ["starter", "computer-systems"],
      summary: "Starter content keeps this category populated."
    };
    const real = article("real-ai", "ai-ml", "2026-06-11T08:00:00.000Z", "Real story");
    const feed = dailyNews([starter, real]);

    expect(getLearningCurrentContext(feed).map((item) => item.id)).toEqual(["real-ai"]);
  });
});

describe("getLearningBridges", () => {
  it("connects each foundation to the most recent matching story when available", () => {
    const feed = dailyNews([
      article("older-ai", "ai-ml", "2026-06-10T08:00:00.000Z"),
      article("latest-ai", "ai-ml", "2026-06-12T08:00:00.000Z"),
      article("systems", "computer-systems", "2026-06-11T08:00:00.000Z")
    ]);

    const aiBridge = getLearningBridges(feed).find(
      (bridge) => bridge.foundation.id === "ai-ml-basics"
    );
    const systemsBridge = getLearningBridges(feed).find(
      (bridge) => bridge.foundation.id === "computer-systems-basics"
    );

    expect(aiBridge?.story?.id).toBe("latest-ai");
    expect(systemsBridge?.story?.id).toBe("systems");
  });

  it("does not bridge foundations to starter placeholders", () => {
    const feed = dailyNews([
      {
        ...article(
          "starter-computer-systems-example",
          "computer-systems",
          "2026-06-12T09:00:00.000Z",
          "Starter source"
        ),
        tags: ["starter", "computer-systems"],
        summary: "Starter content keeps this category populated."
      }
    ]);
    const systemsBridge = getLearningBridges(feed).find(
      (bridge) => bridge.foundation.id === "computer-systems-basics"
    );

    expect(systemsBridge?.story).toBeUndefined();
  });
});
