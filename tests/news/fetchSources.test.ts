import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSourceCandidates } from "@/lib/news/fetchSources";
import type { TrustedSourceConfig } from "@/config/sources";

const source = (
  overrides: Partial<TrustedSourceConfig> & Record<string, unknown> = {}
): TrustedSourceConfig =>
  ({
    name: "Questionable Image Feed",
    homepageUrl: "https://example.com",
    rssUrl: "https://example.com/feed.xml",
    sourceType: "news",
    trustScore: 0.82,
    categoryHints: ["ai-ml"],
    ...overrides
  }) as TrustedSourceConfig;

const feedXml = (itemXml: string) => `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
      <title>Example Feed</title>
      <link>https://example.com</link>
      <item>
        <title>AI model benchmark improves inference tooling</title>
        <link>https://example.com/ai-benchmark</link>
        <description>Machine learning infrastructure and model benchmark details.</description>
        <pubDate>Thu, 11 Jun 2026 09:00:00 GMT</pubDate>
        ${itemXml}
      </item>
    </channel>
  </rss>`;

function mockFeed(xml: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(xml, { status: 200 }))
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchSourceCandidates", () => {
  it("falls back to a category placeholder when extracted image URLs are empty", async () => {
    mockFeed(feedXml('<enclosure url="" type="image/jpeg" />'));

    const items = await fetchSourceCandidates({
      sources: [source()],
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(items).toHaveLength(1);
    expect(items[0].imageUrl).toMatch(/^data:image\/svg\+xml/);
  });

  it("uses placeholders for feeds configured to avoid extracted article images", async () => {
    mockFeed(
      feedXml('<media:content url="https://example.com/bright-stock.jpg" medium="image" />')
    );

    const items = await fetchSourceCandidates({
      sources: [source({ preferArticleImages: false })],
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(items).toHaveLength(1);
    expect(items[0].imageUrl).toMatch(/^data:image\/svg\+xml/);
  });
});
