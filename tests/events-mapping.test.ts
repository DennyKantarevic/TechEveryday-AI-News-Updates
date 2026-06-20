import { describe, expect, it } from "vitest";
import {
  interactionEventToReadingEventRow,
  readingEventRowToInteractionEvent
} from "@/lib/events/readingEvents";
import type { InteractionEvent } from "@/lib/interactions";

describe("reading event row mapping", () => {
  it("preserves minimal article context for account-backed recommendations", () => {
    const event: InteractionEvent = {
      type: "article_opened",
      articleId: "cloud-1",
      article: {
        id: "cloud-1",
        title: "Cloud traces explain latency",
        summary: "A technical production tracing article.",
        url: "https://example.com/cloud-1",
        sourceName: "Example Engineering",
        sourceType: "official",
        category: "cloud-infrastructure",
        publishedAt: "2026-06-12T08:00:00.000Z",
        foundAt: "2026-06-12T09:00:00.000Z",
        tags: ["observability", "latency"]
      },
      category: "cloud-infrastructure",
      sourceType: "official",
      createdAt: "2026-06-12T10:00:00.000Z"
    };

    const row = {
      ...interactionEventToReadingEventRow("user-1", event),
      id: "event-row-1",
      created_at: event.createdAt,
      source_name: "Example Engineering"
    };
    const restored = readingEventRowToInteractionEvent(row);

    expect(restored.type).toBe("article_opened");
    expect(restored.article?.title).toBe("Cloud traces explain latency");
    expect(restored.article?.tags).toEqual(["observability", "latency"]);
    expect(restored.category).toBe("cloud-infrastructure");
  });
});
