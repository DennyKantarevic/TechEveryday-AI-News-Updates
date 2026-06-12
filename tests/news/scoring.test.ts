import { describe, expect, it } from "vitest";
import { scoreNewsItem } from "@/lib/news/scoring";
import type { NewsItem } from "@/types/news";

function candidate(
  id: string,
  title: string,
  summary: string
): Omit<
  NewsItem,
  | "canonicalUrl"
  | "freshnessScore"
  | "technicalDepthScore"
  | "educationalScore"
  | "practicalUsefulnessScore"
  | "noveltyScore"
  | "finalScore"
  | "keyClaims"
  | "whyItMatters"
> {
  return {
    id,
    title,
    summary,
    url: `https://example.com/${id}`,
    sourceName: "Example Research",
    sourceType: "paper",
    category: "research-papers",
    publishedAt: "2026-06-12T08:00:00.000Z",
    foundAt: "2026-06-12T09:00:00.000Z",
    imageUrl: "placeholder:research-papers",
    trustScore: 0.9,
    saved: false,
    tags: ["research-papers", "benchmark"]
  };
}

describe("scoreNewsItem", () => {
  it("normalizes article text and creates source-grounded why-it-matters copy", () => {
    const now = new Date("2026-06-12T12:00:00.000Z");
    const weaver = scoreNewsItem(
      candidate(
        "weaver",
        "$\\texttt{WEAVER}$, Better, Faster, Longer",
        "WEAVER extends robotic manipulation rollouts while reducing inference cost on long-horizon tasks. The paper reports better sample efficiency on manipulation benchmarks."
      ),
      now
    );
    const systems = scoreNewsItem(
      candidate(
        "systems",
        "Cache-aware scheduler reduces tail latency",
        "The scheduler moves cache-heavy jobs away from contended nodes and cuts p99 latency in production traces. The authors detail the tradeoff between locality and fairness."
      ),
      now
    );

    expect(weaver.title).toBe("WEAVER, Better, Faster, Longer");
    expect(weaver.whyItMatters).toContain("robotic manipulation");
    expect(systems.whyItMatters).toContain("p99 latency");
    expect(weaver.whyItMatters).not.toBe(systems.whyItMatters);
    expect(weaver.whyItMatters).not.toMatch(/future of technology|useful insights|progress in AI/i);
  });

  it("does not damage brand and acronym casing in generated why-it-matters copy", () => {
    const scored = scoreNewsItem(
      {
        ...candidate(
          "openai-agent",
          "OpenAI expands long-running agent environments",
          "OpenAI plans persistent cloud environments for Codex agents so developers can run longer tasks with reviewable checkpoints."
        ),
        sourceType: "official",
        sourceName: "OpenAI Blog",
        category: "automation-agentic-systems"
      },
      new Date("2026-06-12T12:00:00.000Z")
    );

    expect(scored.whyItMatters).toContain("OpenAI plans");
    expect(scored.whyItMatters).not.toContain("openAI");
  });

  it("removes source paywall markers from normalized titles", () => {
    const scored = scoreNewsItem(
      {
        ...candidate(
          "lwn-mthp",
          "[$] Automatic mTHP creation in 7.2",
          "The Linux kernel article explains multi-size transparent huge pages, memory behavior, and performance tradeoffs."
        ),
        sourceType: "news",
        sourceName: "LWN.net",
        category: "computer-systems"
      },
      new Date("2026-06-12T12:00:00.000Z")
    );

    expect(scored.title).toBe("Automatic mTHP creation in 7.2");
  });
});
