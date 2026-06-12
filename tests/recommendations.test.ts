import { describe, expect, it } from "vitest";
import {
  getFoundationalLearningRecommendations,
  getRecommendations,
  hasEnoughInteractionData
} from "@/lib/recommendations";
import type { NewsItem } from "@/types/news";

const now = new Date("2026-06-12T12:00:00.000Z");

function newsItem(overrides: Partial<NewsItem> & Pick<NewsItem, "id" | "title">): NewsItem {
  return {
    summary: "A concise technical update.",
    url: `https://example.com/${overrides.id}`,
    sourceName: "Example Source",
    sourceType: "news",
    category: "ai-ml",
    publishedAt: "2026-06-12T08:00:00.000Z",
    foundAt: "2026-06-12T09:00:00.000Z",
    imageUrl: "data:image/svg+xml,placeholder",
    trustScore: 0.9,
    saved: false,
    tags: [],
    ...overrides
  };
}

describe("getRecommendations", () => {
  it("weights saved topics above casual views and excludes exact saved articles", () => {
    const savedAgentic = newsItem({
      id: "saved-agentic",
      title: "Agentic AI orchestration patterns",
      summary: "A practical guide to multi-agent workflow planning.",
      category: "automation-agentic-systems",
      sourceType: "blog",
      saved: true,
      tags: ["agentic AI", "workflow automation"]
    });
    const viewedSystems = newsItem({
      id: "viewed-systems",
      title: "Runtime response automation",
      summary: "Systems teams automate triage and patch workflows.",
      category: "computer-systems",
      tags: ["runtime", "automation"]
    });
    const agenticCandidate = newsItem({
      id: "agentic-new",
      title: "Agentic AI runtimes improve workflow planning",
      summary: "New orchestration features help teams run reliable AI agents.",
      category: "automation-agentic-systems",
      sourceType: "official",
      tags: ["agentic AI", "orchestration"]
    });
    const systemsCandidate = newsItem({
      id: "systems-new",
      title: "Patch management systems add triage automation",
      summary: "Systems operations teams prioritize runtime maintenance.",
      category: "computer-systems",
      tags: ["runtime", "patching"]
    });

    const recommendations = getRecommendations({
      articles: [savedAgentic, systemsCandidate, agenticCandidate],
      events: [
        {
          type: "article_viewed",
          articleId: viewedSystems.id,
          article: viewedSystems,
          category: viewedSystems.category,
          createdAt: "2026-06-12T09:00:00.000Z"
        },
        {
          type: "article_saved",
          articleId: savedAgentic.id,
          article: savedAgentic,
          category: savedAgentic.category,
          createdAt: "2026-06-12T09:05:00.000Z"
        }
      ],
      limit: 5,
      now
    });

    expect(recommendations.map((recommendation) => recommendation.item.id)).toEqual([
      "agentic-new",
      "systems-new"
    ]);
    expect(recommendations[0].score).toBeGreaterThan(recommendations[1].score);
    expect(recommendations[0].reason).toBe(
      "Recommended because you saved agentic AI articles."
    );
  });

  it("prefers fresher articles when interest overlap is otherwise similar", () => {
    const savedCloud = newsItem({
      id: "saved-cloud",
      title: "Cloud observability for production systems",
      summary: "Teams improve reliability with tracing and incident context.",
      category: "cloud-infrastructure",
      saved: true,
      tags: ["observability", "reliability"]
    });
    const freshCloud = newsItem({
      id: "fresh-cloud",
      title: "Observability systems reduce incident response time",
      summary: "Cloud teams add tracing for reliability work.",
      category: "cloud-infrastructure",
      publishedAt: "2026-06-12T07:00:00.000Z",
      tags: ["observability", "reliability"]
    });
    const olderCloud = newsItem({
      id: "older-cloud",
      title: "Reliability teams tune observability dashboards",
      summary: "Tracing and incident metrics improve production operations.",
      category: "cloud-infrastructure",
      publishedAt: "2026-05-20T07:00:00.000Z",
      foundAt: "2026-05-20T08:00:00.000Z",
      tags: ["observability", "reliability"]
    });

    const recommendations = getRecommendations({
      articles: [olderCloud, freshCloud],
      events: [
        {
          type: "gallery_saved",
          articleId: savedCloud.id,
          article: savedCloud,
          category: savedCloud.category,
          createdAt: "2026-06-12T09:00:00.000Z"
        }
      ],
      now
    });

    expect(recommendations.map((recommendation) => recommendation.item.id)).toEqual([
      "fresh-cloud",
      "older-cloud"
    ]);
  });

  it("uses foundational fallback items only when they match user interests", () => {
    const cloudStarter = newsItem({
      id: "starter-cloud-infrastructure-example",
      title: "Cloud infrastructure foundational source",
      summary: "Starter content for cloud infrastructure.",
      category: "cloud-infrastructure",
      tags: ["starter", "cloud-infrastructure"]
    });
    const aiStarter = newsItem({
      id: "starter-ai-ml-example",
      title: "AI ML foundational source",
      summary: "Starter content for AI ML.",
      category: "ai-ml",
      tags: ["starter", "ai-ml"]
    });

    const recommendations = getRecommendations({
      articles: [aiStarter, cloudStarter],
      events: [
        {
          type: "category_visited",
          category: "cloud-infrastructure",
          createdAt: "2026-06-12T09:00:00.000Z"
        },
        {
          type: "article_opened",
          articleId: "opened-cloud",
          article: newsItem({
            id: "opened-cloud",
            title: "Cloud reliability update",
            category: "cloud-infrastructure",
            tags: ["reliability"]
          }),
          category: "cloud-infrastructure",
          createdAt: "2026-06-12T09:05:00.000Z"
        }
      ],
      now
    });

    expect(recommendations.map((recommendation) => recommendation.item.id)).toEqual([
      "starter-cloud-infrastructure-example"
    ]);
  });

  it("ignores old interaction history for categories that are no longer active", () => {
    const oldRemovedCategoryArticle = newsItem({
      id: "old-security",
      title: "Security incident analysis",
      summary: "An old saved security story from a removed site section.",
      category: "cybersecurity" as never,
      saved: true,
      tags: ["cybersecurity", "incident response"]
    });
    const cloudCandidate = newsItem({
      id: "cloud-candidate",
      title: "Incident response automation improves cloud operations",
      summary: "Cloud teams automate production response workflows.",
      category: "cloud-infrastructure",
      sourceType: "official",
      tags: ["incident response", "automation"]
    });

    const oldRemovedCategoryEvents = [
      {
        type: "article_saved" as const,
        articleId: oldRemovedCategoryArticle.id,
        article: oldRemovedCategoryArticle,
        category: "cybersecurity" as never,
        createdAt: "2026-06-12T09:00:00.000Z"
      }
    ];

    expect(hasEnoughInteractionData(oldRemovedCategoryEvents)).toBe(false);
    expect(
      getRecommendations({
        articles: [cloudCandidate],
        events: oldRemovedCategoryEvents,
        now
      })
    ).toEqual([]);
  });
});

describe("getFoundationalLearningRecommendations", () => {
  it("returns learning fallback items only when they match user interests", () => {
    const savedAgentic = newsItem({
      id: "saved-agentic",
      title: "Agentic AI orchestration patterns",
      summary: "A practical guide to multi-agent workflow planning.",
      category: "automation-agentic-systems",
      saved: true,
      tags: ["agentic AI", "workflow automation"]
    });

    const recommendations = getFoundationalLearningRecommendations({
      foundations: [
        {
          id: "agents-automation-basics",
          title: "Agents and automation basics",
          deck: "How models become task runners through tools, plans, and guardrails.",
          categoryIds: ["automation-agentic-systems"],
          tags: ["agentic AI"]
        },
        {
          id: "cloud-infrastructure-basics",
          title: "Cloud/infrastructure basics",
          deck: "The operational foundation for running software at scale.",
          categoryIds: ["cloud-infrastructure"],
          tags: ["observability"]
        }
      ],
      events: [
        {
          type: "article_saved",
          articleId: savedAgentic.id,
          article: savedAgentic,
          category: savedAgentic.category,
          createdAt: "2026-06-12T09:00:00.000Z"
        }
      ]
    });

    expect(recommendations.map((recommendation) => recommendation.item.id)).toEqual([
      "agents-automation-basics"
    ]);
    expect(recommendations[0].reason).toBe(
      "Recommended because you saved agentic AI articles."
    );
  });
});

describe("hasEnoughInteractionData", () => {
  it("requires either one save-strength signal or multiple lighter signals", () => {
    expect(hasEnoughInteractionData([])).toBe(false);
    expect(
      hasEnoughInteractionData([
        {
          type: "category_visited",
          category: "ai-ml",
          createdAt: "2026-06-12T09:00:00.000Z"
        }
      ])
    ).toBe(false);
    expect(
      hasEnoughInteractionData([
        {
          type: "article_saved",
          articleId: "saved-ai",
          article: newsItem({
            id: "saved-ai",
            title: "Applied AI deployment patterns",
            tags: ["applied AI"]
          }),
          category: "ai-ml",
          createdAt: "2026-06-12T09:00:00.000Z"
        }
      ])
    ).toBe(true);
    expect(
      hasEnoughInteractionData([
        {
          type: "article_viewed",
          articleId: "viewed-ai",
          article: newsItem({
            id: "viewed-ai",
            title: "Applied AI deployment patterns",
            tags: ["applied AI"]
          }),
          category: "ai-ml",
          createdAt: "2026-06-12T09:00:00.000Z"
        },
        {
          type: "article_opened",
          articleId: "opened-ai",
          article: newsItem({
            id: "opened-ai",
            title: "Applied AI operations",
            tags: ["applied AI"]
          }),
          category: "ai-ml",
          createdAt: "2026-06-12T09:05:00.000Z"
        }
      ])
    ).toBe(true);
  });
});
