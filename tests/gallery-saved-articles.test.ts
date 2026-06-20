import { describe, expect, it } from "vitest";
import {
  newsItemToSavedArticleRow,
  savedArticleRowToNewsItem
} from "@/lib/gallery/savedArticles";
import type { NewsItem } from "@/types/news";

const item: NewsItem = {
  id: "paper-1",
  title: "Robotics benchmark explains longer-horizon manipulation",
  summary: "The paper reports better rollout length for robotic manipulation.",
  url: "https://example.com/paper-1",
  canonicalUrl: "https://example.com/paper-1",
  sourceName: "arXiv",
  sourceType: "paper",
  category: "research-papers",
  publishedAt: "2026-06-12T08:00:00.000Z",
  foundAt: "2026-06-12T09:00:00.000Z",
  imageUrl: "data:image/svg+xml,placeholder",
  trustScore: 0.9,
  freshnessScore: 5,
  technicalDepthScore: 4,
  educationalScore: 4,
  practicalUsefulnessScore: 3,
  noveltyScore: 2,
  finalScore: 4.2,
  saved: false,
  tags: ["robotics", "world models"],
  keyClaims: ["The model extends long-horizon manipulation rollouts."],
  whyItMatters: "It explains a concrete robotics benchmark improvement."
};

describe("saved article row mapping", () => {
  it("preserves full NewsItem metadata in the account payload", () => {
    const row = {
      ...newsItemToSavedArticleRow("user-1", item),
      saved_at: "2026-06-12T10:00:00.000Z"
    };

    const restored = savedArticleRowToNewsItem(row);

    expect(restored.id).toBe(item.id);
    expect(restored.sourceType).toBe("paper");
    expect(restored.category).toBe("research-papers");
    expect(restored.tags).toEqual(["robotics", "world models"]);
    expect(restored.whyItMatters).toBe("It explains a concrete robotics benchmark improvement.");
    expect(restored.saved).toBe(true);
  });
});
