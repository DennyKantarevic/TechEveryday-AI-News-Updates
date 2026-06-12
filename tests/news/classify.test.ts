import { describe, expect, it } from "vitest";
import { CATEGORY_IDS } from "@/config/categories";
import {
  classifyCategory,
  dedupeCandidates,
  selectDailyItems
} from "@/lib/news/classify";
import type { NewsItem } from "@/types/news";

const baseItem = (overrides: Partial<NewsItem>): NewsItem => ({
  id: overrides.id ?? "item-1",
  title: overrides.title ?? "AI agents learn to automate developer workflows",
  summary: overrides.summary ?? "A concise summary.",
  url: overrides.url ?? "https://example.com/item-1",
  sourceName: overrides.sourceName ?? "Example Source",
  sourceType: overrides.sourceType ?? "news",
  category: overrides.category ?? "ai-ml",
  publishedAt: overrides.publishedAt ?? "2026-06-11T08:00:00.000Z",
  foundAt: overrides.foundAt ?? "2026-06-11T09:00:00.000Z",
  imageUrl: overrides.imageUrl ?? "data:image/svg+xml,placeholder",
  trustScore: overrides.trustScore ?? 0.9,
  saved: overrides.saved ?? false,
  tags: overrides.tags ?? ["ai"]
});

describe("classifyCategory", () => {
  it("maps paper items to Research Papers first", () => {
    expect(
      classifyCategory({
        title: "A new transformer benchmark",
        summary: "Research paper on large language models.",
        sourceType: "paper",
        sourceName: "arXiv"
      })
    ).toBe("research-papers");
  });

  it("classifies infrastructure language into Cloud / Infrastructure", () => {
    expect(
      classifyCategory({
        title: "Cloudflare announces new workers observability tools",
        summary: "Infrastructure logs and edge compute updates.",
        sourceType: "blog",
        sourceName: "Cloudflare Blog"
      })
    ).toBe("cloud-infrastructure");
  });
});

describe("dedupeCandidates", () => {
  it("deduplicates exact URLs and very similar titles", () => {
    const items = [
      baseItem({ id: "a", url: "https://example.com/a", title: "OpenAI launches a new model for developers" }),
      baseItem({ id: "b", url: "https://example.com/a", title: "Different syndication title" }),
      baseItem({ id: "c", url: "https://example.com/c", title: "OpenAI launches new model for developers" })
    ];

    expect(dedupeCandidates(items).map((item) => item.id)).toEqual(["a"]);
  });
});

describe("selectDailyItems", () => {
  it("preserves previous category content when no trusted new content exists today", () => {
    const previous = Object.fromEntries(CATEGORY_IDS.map((id) => [id, [] as NewsItem[]]));
    previous["cybersecurity"] = [
      baseItem({
        id: "old-sec",
        category: "cybersecurity",
        title: "Previous security story",
        foundAt: "2026-06-10T12:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [baseItem({ id: "new-ai", category: "ai-ml" })],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["cybersecurity"].map((item) => item.id)).toEqual(["old-sec"]);
    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["new-ai"]);
  });

  it("filters broad trusted-source items that have no technical relevance signal", () => {
    const previous = Object.fromEntries(CATEGORY_IDS.map((id) => [id, [] as NewsItem[]]));
    previous["computer-systems"] = [
      baseItem({
        id: "old-systems",
        category: "computer-systems",
        title: "Previous systems story",
        foundAt: "2026-06-10T12:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "policy-story",
          category: "computer-systems",
          title: "Senators debate media policy",
          summary: "A broad political update without a computing systems angle.",
          sourceName: "Ars Technica",
          trustScore: 0.82,
          tags: []
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["computer-systems"].map((item) => item.id)).toEqual(["old-systems"]);
  });

  it("does not treat short technical terms as substrings inside unrelated words", () => {
    const previous = Object.fromEntries(CATEGORY_IDS.map((id) => [id, [] as NewsItem[]]));
    previous["ai-ml"] = [
      baseItem({
        id: "old-ai",
        category: "ai-ml",
        title: "Previous AI story",
        foundAt: "2026-06-10T12:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "available-story",
          category: "ai-ml",
          title: "Available policy update arrives today",
          summary: "A general update that only contains the letters a and i as part of longer words.",
          sourceName: "Example Source",
          trustScore: 0.82,
          tags: []
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["old-ai"]);
  });
});
