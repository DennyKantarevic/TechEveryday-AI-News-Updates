import { describe, expect, it } from "vitest";
import {
  FRESHNESS_WINDOW_HOURS,
  evaluateFreshness,
  isFreshNewsItem
} from "@/lib/news/freshness";
import type { NewsItem } from "@/types/news";

const now = new Date("2026-06-12T12:00:00.000Z");

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    id: "fresh-item",
    title: "Cloud infrastructure benchmark explains production latency",
    summary: "A technical engineering writeup about latency, architecture, and operations.",
    url: "https://example.com/fresh-item",
    canonicalUrl: "https://example.com/fresh-item",
    sourceName: "Example Engineering",
    sourceType: "official",
    category: "cloud-infrastructure",
    publishedAt: "2026-06-11T12:00:00.000Z",
    foundAt: now.toISOString(),
    imageUrl: "data:image/svg+xml,placeholder",
    trustScore: 0.9,
    freshnessScore: 5,
    technicalDepthScore: 4,
    educationalScore: 4,
    practicalUsefulnessScore: 4,
    noveltyScore: 0,
    finalScore: 4.4,
    saved: false,
    tags: ["cloud", "latency"],
    keyClaims: ["Latency architecture changed."],
    whyItMatters: "It helps teams reason about production reliability.",
    ...overrides
  };
}

describe("freshness gate", () => {
  it("uses a strict 72 hour window", () => {
    expect(FRESHNESS_WINDOW_HOURS).toBe(72);
  });

  it("accepts items inside the 72 hour window and assigns a freshness score", () => {
    const result = evaluateFreshness({
      publishedAt: "2026-06-09T12:01:00.000Z",
      now
    });

    expect(result.accepted).toBe(true);
    expect(result.freshnessScore).toBeGreaterThan(0);
    expect(result.excludedReason).toBeUndefined();
  });

  it("rejects items older than 72 hours", () => {
    const result = evaluateFreshness({
      publishedAt: "2026-06-09T11:59:00.000Z",
      now
    });

    expect(result.accepted).toBe(false);
    expect(result.excludedReason).toMatch(/older than 72 hours/i);
  });

  it("rejects missing, invalid, and suspicious future dates", () => {
    expect(evaluateFreshness({ now }).excludedReason).toMatch(/trustworthy date/i);
    expect(evaluateFreshness({ publishedAt: "not-a-date", now }).excludedReason).toMatch(
      /trustworthy date/i
    );
    expect(
      evaluateFreshness({
        publishedAt: "2026-06-12T14:00:00.000Z",
        now
      }).excludedReason
    ).toMatch(/future/i);
  });

  it("checks NewsItem published dates without falling back to foundAt for stale stories", () => {
    const stale = item({
      publishedAt: "2026-06-08T12:00:00.000Z",
      foundAt: now.toISOString()
    });

    expect(isFreshNewsItem(stale, now)).toBe(false);
  });
});
