import { describe, expect, it } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import {
  classifyCategory,
  dedupeCandidates,
  scoreContentQuality,
  selectDailyItems
} from "@/lib/news/classify";
import type { NewsItem } from "@/types/news";

const baseItem = (overrides: Partial<NewsItem>): NewsItem => ({
  id: overrides.id ?? "item-1",
  title: overrides.title ?? "AI agents learn to automate developer workflows",
  summary: overrides.summary ?? "A concise summary.",
  url: overrides.url ?? "https://example.com/item-1",
  canonicalUrl: overrides.canonicalUrl ?? overrides.url ?? "https://example.com/item-1",
  sourceName: overrides.sourceName ?? "Example Source",
  sourceType: overrides.sourceType ?? "news",
  category: overrides.category ?? "ai-ml",
  publishedAt: overrides.publishedAt ?? "2026-06-11T08:00:00.000Z",
  foundAt: overrides.foundAt ?? "2026-06-11T09:00:00.000Z",
  imageUrl: overrides.imageUrl ?? "data:image/svg+xml,placeholder",
  trustScore: overrides.trustScore ?? 0.9,
  freshnessScore: overrides.freshnessScore ?? 4,
  technicalDepthScore: overrides.technicalDepthScore ?? 3,
  educationalScore: overrides.educationalScore ?? 3,
  practicalUsefulnessScore: overrides.practicalUsefulnessScore ?? 3,
  noveltyScore: overrides.noveltyScore ?? 0,
  finalScore: overrides.finalScore ?? 3.7,
  saved: overrides.saved ?? false,
  tags: overrides.tags ?? ["ai"],
  keyClaims: overrides.keyClaims ?? ["A technical system changed."],
  whyItMatters: overrides.whyItMatters ?? "It helps readers understand a current technical change.",
  excludedReason: overrides.excludedReason
});

const emptyPreviousCategories = () => createCategoryRecord(() => [] as NewsItem[]);

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
  it("preserves previous category content only when it is still inside 72 hours", () => {
    const previous = emptyPreviousCategories();
    previous["cloud-infrastructure"] = [
      baseItem({
        id: "old-cloud",
        category: "cloud-infrastructure",
        title: "Previous cloud observability architecture story",
        summary:
          "An engineering explainer about cloud observability architecture, reliability, tracing, and production operations.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["cloud", "observability", "architecture"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [baseItem({ id: "new-ai", category: "ai-ml" })],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["cloud-infrastructure"].map((item) => item.id)).toEqual(["old-cloud"]);
    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["new-ai"]);
  });

  it("does not preserve previous category content older than 72 hours", () => {
    const previous = emptyPreviousCategories();
    previous["cloud-infrastructure"] = [
      baseItem({
        id: "stale-cloud",
        category: "cloud-infrastructure",
        title: "Stale cloud story",
        publishedAt: "2026-06-08T12:59:00.000Z",
        foundAt: "2026-06-08T13:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["cloud-infrastructure"]).toEqual([]);
  });

  it("does not preserve starter placeholders even when their timestamps are fresh", () => {
    const previous = emptyPreviousCategories();
    previous["embedded-systems"] = [
      baseItem({
        id: "starter-embedded-systems-ieee-spectrum",
        category: "embedded-systems",
        title: "IEEE Spectrum trusted Embedded Systems source",
        summary: "Starter content identifies a trusted source but is not a fetched article.",
        publishedAt: "2026-06-12T09:00:00.000Z",
        foundAt: "2026-06-12T09:00:00.000Z",
        tags: ["starter", "embedded-systems"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [],
      previousCategories: previous,
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["embedded-systems"]).toEqual([]);
  });

  it("keeps current candidates within 72 hours even when they are not from the same calendar day", () => {
    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "two-day-old-paper",
          category: "research-papers",
          sourceType: "paper",
          sourceName: "arXiv",
          title: "Distributed systems paper explains consensus benchmark",
          summary:
            "A research paper with benchmark, dataset, method, and implementation details for distributed systems.",
          publishedAt: "2026-06-09T14:00:00.000Z",
          foundAt: "2026-06-11T13:00:00.000Z",
          tags: ["arxiv", "benchmark", "distributed systems"]
        })
      ],
      previousCategories: emptyPreviousCategories(),
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["research-papers"].map((item) => item.id)).toEqual(["two-day-old-paper"]);
  });

  it("rejects candidates older than 72 hours instead of showing stale filler", () => {
    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "old-ai",
          category: "ai-ml",
          title: "Old AI model architecture analysis",
          summary:
            "A technical explainer about model architecture, benchmarks, training, and inference.",
          publishedAt: "2026-06-09T12:59:00.000Z",
          foundAt: "2026-06-12T13:00:00.000Z",
          tags: ["ai", "model", "benchmark", "architecture"]
        })
      ],
      previousCategories: emptyPreviousCategories(),
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["ai-ml"]).toEqual([]);
  });

  it("filters broad trusted-source items that have no technical relevance signal", () => {
    const previous = emptyPreviousCategories();
    previous["computer-systems"] = [
      baseItem({
        id: "old-systems",
        category: "computer-systems",
        title: "Previous distributed systems runtime story",
        summary:
          "A technical analysis of distributed runtime architecture, storage reliability, and operational tradeoffs.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["distributed", "runtime", "storage"]
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

  it("filters entertainment, drama, and fake-podcast style low-signal stories", () => {
    const previous = emptyPreviousCategories();
    previous["developer-tools-open-source"] = [
      baseItem({
        id: "old-devtools",
        category: "developer-tools-open-source",
        title: "Previous developer tools framework release",
        summary:
          "A practical developer guide covering framework APIs, CLI workflows, migration details, and open source maintenance.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["developer", "framework", "cli", "open source"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "fake-podcast",
          category: "developer-tools-open-source",
          title: "Drug sites hijacked Spotify's search ranking through fake podcasts",
          summary:
            "A viral entertainment story about fake podcasts and online drama with little practical technical detail.",
          sourceName: "Wired",
          trustScore: 0.82,
          tags: ["viral", "fake podcast", "drama"]
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["developer-tools-open-source"].map((item) => item.id)).toEqual([
      "old-devtools"
    ]);
  });

  it("does not let low-value AI culture drama through just because it has tech keywords", () => {
    const previous = emptyPreviousCategories();
    previous["ai-ml"] = [
      baseItem({
        id: "old-ai",
        category: "ai-ml",
        title: "Previous AI engineering story",
        foundAt: "2026-06-10T12:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "viral-ai-drama",
          category: "ai-ml",
          title: "Viral AI app drama sparks creator outrage",
          summary:
            "A celebrity creator rumor and meme cycle around a viral AI app with no technical implementation detail.",
          sourceName: "The Verge",
          trustScore: 0.78,
          tags: ["ai", "viral", "drama", "rumor"]
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["old-ai"]);
  });

  it("does not treat short technical terms as substrings inside unrelated words", () => {
    const previous = emptyPreviousCategories();
    previous["ai-ml"] = [
      baseItem({
        id: "old-ai",
        category: "ai-ml",
        title: "Previous AI model benchmark story",
        summary:
          "A technical model benchmark explainer covering training, inference, architecture, and evaluation details.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["ai", "model", "benchmark", "training"]
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

  it("limits single-source dominance when enough same-category alternatives exist", () => {
    const previous = emptyPreviousCategories();
    const candidates = [
      baseItem({
        id: "openai-1",
        title: "OpenAI releases a new AI model for developers",
        url: "https://openai.com/news/1",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "openai-2",
        title: "OpenAI expands model inference infrastructure",
        url: "https://openai.com/news/2",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "openai-3",
        title: "OpenAI publishes machine learning platform update",
        url: "https://openai.com/news/3",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "openai-4",
        title: "OpenAI improves multimodal model training",
        url: "https://openai.com/news/4",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "google-1",
        title: "Google Research shares a new machine learning benchmark",
        url: "https://research.google/blog/benchmark",
        sourceName: "Google Research Blog",
        trustScore: 0.93
      }),
      baseItem({
        id: "anthropic-1",
        title: "Anthropic details AI agent evaluation research",
        url: "https://anthropic.com/news/agent-evals",
        sourceName: "Anthropic News",
        trustScore: 0.92
      })
    ];

    const selected = selectDailyItems({
      candidates,
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    const aiSources = selected["ai-ml"].map((item) => item.sourceName);
    const openAiCount = aiSources.filter((source) => source === "OpenAI Blog").length;

    expect(selected["ai-ml"]).toHaveLength(5);
    expect(openAiCount).toBeLessThanOrEqual(3);
    expect(new Set(aiSources).size).toBeGreaterThanOrEqual(3);
  });
});

describe("scoreContentQuality", () => {
  it("explains why low-information novelty stories are excluded", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "Celebrity prank app goes viral after fake podcast drama",
        summary: "A light entertainment-only story about a viral meme and creator outrage.",
        category: "developer-tools-open-source",
        tags: ["celebrity", "prank", "viral", "drama"]
      })
    );

    expect(score.educationalScore).toBeLessThan(2);
    expect(score.technicalDepthScore).toBeLessThan(2);
    expect(score.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("keeps practical technical explainers and engineering writeups", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "Cloudflare explains new Workers observability architecture",
        summary:
          "The engineering writeup details tracing, metrics, runtime architecture, reliability tradeoffs, and implementation guidance for production teams.",
        category: "cloud-infrastructure",
        sourceName: "Cloudflare Blog",
        sourceType: "official",
        tags: ["observability", "runtime", "architecture", "engineering"]
      })
    );

    expect(score.educationalScore).toBeGreaterThanOrEqual(2);
    expect(score.technicalDepthScore).toBeGreaterThanOrEqual(2);
    expect(score.practicalUsefulnessScore).toBeGreaterThanOrEqual(1);
    expect(score.excludedReason).toBeUndefined();
  });
});
