import { describe, expect, it } from "vitest";
import { renderDailyNewsletterEmail } from "@/lib/email/templates/dailyNewsletter";

describe("daily newsletter email template", () => {
  it("includes article content and unsubscribe link", () => {
    const result = renderDailyNewsletterEmail({
      baseUrl: "https://techeveryday.example",
      unsubscribeUrl: "https://techeveryday.example/api/email/unsubscribe?token=abc",
      items: [
        {
          title: "Cloud scheduler explains p99 latency",
          url: "https://example.com/cloud",
          sourceName: "Example Engineering",
          summary: "A scheduler writeup explains production latency.",
          whyItMatters: "It shows how teams trade locality against fairness.",
          category: "Cloud / Infrastructure"
        }
      ]
    });

    expect(result.subject).toBe(
      "TechEveryday: Today's AI, Systems, and Infrastructure Brief"
    );
    expect(result.html).toContain("Cloud scheduler explains p99 latency");
    expect(result.html).toContain("Unsubscribe");
    expect(result.text).toContain(
      "https://techeveryday.example/api/email/unsubscribe?token=abc"
    );
  });
});
