import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchCategoryFallbackCandidates,
  fetchSourceCandidates
} from "@/lib/news/fetchSources";
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

const feedItemXml = ({
  title = "AI model benchmark improves inference tooling",
  link = "https://example.com/ai-benchmark",
  description = "Machine learning infrastructure and model benchmark details.",
  pubDate = "Thu, 11 Jun 2026 09:00:00 GMT",
  extraXml = ""
}: {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  extraXml?: string;
} = {}) => `
      <item>
        <title>${title}</title>
        <link>${link}</link>
        <description>${description}</description>
        <pubDate>${pubDate}</pubDate>
        ${extraXml}
      </item>`;

const feedXml = (itemXml: string) => `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
      <title>Example Feed</title>
      <link>https://example.com</link>
      ${itemXml}
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
    mockFeed(feedXml(feedItemXml({ extraXml: '<enclosure url="" type="image/jpeg" />' })));

    const items = await fetchSourceCandidates({
      sources: [source()],
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(items).toHaveLength(1);
    expect(items[0].imageUrl).toMatch(/^data:image\/svg\+xml/);
  });

  it("uses placeholders for feeds configured to avoid extracted article images", async () => {
    mockFeed(
      feedXml(
        feedItemXml({
          extraXml: '<media:content url="https://example.com/bright-stock.jpg" medium="image" />'
        })
      )
    );

    const items = await fetchSourceCandidates({
      sources: [source({ preferArticleImages: false })],
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(items).toHaveLength(1);
    expect(items[0].imageUrl).toMatch(/^data:image\/svg\+xml/);
  });

  it("can run a deeper fallback pass for underfilled section feeds", async () => {
    const filler = Array.from({ length: 16 }, (_, index) =>
      feedItemXml({
        title: `General company update ${index}`,
        link: `https://example.com/general-${index}`,
        description: "A broad nontechnical company update."
      })
    ).join("");
    mockFeed(
      feedXml(
        `${filler}${feedItemXml({
          title: "Embedded firmware benchmark improves microcontroller power use",
          link: "https://example.com/embedded-firmware",
          description:
            "A technical embedded systems writeup with firmware architecture, sensor timing, memory constraints, and power benchmark details."
        })}`
      )
    );

    const shallow = await fetchSourceCandidates({
      sources: [source({ categoryHints: ["embedded-systems"] })],
      now: new Date("2026-06-11T13:00:00.000Z")
    });
    const deep = await fetchSourceCandidates({
      sources: [source({ categoryHints: ["embedded-systems"] })],
      now: new Date("2026-06-11T13:00:00.000Z"),
      itemLimit: 24
    });

    expect(shallow.some((item) => item.id.includes("embedded"))).toBe(false);
    expect(deep.some((item) => item.url === "https://example.com/embedded-firmware")).toBe(true);
  });

  it("keeps source items inside their configured category coverage", async () => {
    mockFeed(
      feedXml(
        feedItemXml({
          title: "Cloud benchmark wording for an embedded firmware board",
          link: "https://example.com/board",
          description:
            "A firmware architecture writeup for an embedded microcontroller board with memory, sensor, and power benchmark details."
        })
      )
    );

    const items = await fetchSourceCandidates({
      sources: [
        source({
          categoryHints: ["embedded-systems"],
          allowedCategories: ["embedded-systems"]
        })
      ],
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(items[0].category).toBe("embedded-systems");
  });
});

describe("fetchCategoryFallbackCandidates diagnostics", () => {
  it("keeps healthy fallback items while reporting a non-OK feed failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("healthy-feed")) {
          return new Response(
            feedXml(
              feedItemXml({
                title: "Cloud runtime observability implementation guide",
                link: "https://healthy.example/cloud-runtime",
                description:
                  "A technical cloud infrastructure guide with runtime architecture, observability, reliability, benchmarks, and production implementation details."
              })
            ),
            { status: 200 }
          );
        }

        return new Response("Service unavailable", {
          status: 503,
          statusText: "Service Unavailable"
        });
      })
    );
    const onSourceFailure = vi.fn();

    const items = await fetchCategoryFallbackCandidates({
      categoryId: "cloud-infrastructure",
      sources: [
        source({
          name: "Healthy Cloud Feed",
          rssUrl: "https://healthy.example/healthy-feed.xml",
          categoryHints: ["cloud-infrastructure"],
          allowedCategories: ["cloud-infrastructure"]
        }),
        source({
          name: "Broken Cloud Feed",
          rssUrl: "https://broken.example/broken-feed.xml",
          categoryHints: ["cloud-infrastructure"],
          allowedCategories: ["cloud-infrastructure"]
        })
      ],
      now: new Date("2026-06-11T13:00:00.000Z"),
      onSourceFailure
    });

    expect(items.map((item) => item.url)).toEqual(["https://healthy.example/cloud-runtime"]);
    expect(onSourceFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceName: "Broken Cloud Feed",
        error: expect.objectContaining({
          message: expect.stringMatching(/503.*service unavailable/i)
        })
      })
    );
  });

  it("reports thrown fetch and feed parse errors per source", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL | Request) => {
        const url = String(input);

        if (url.includes("fetch-error")) {
          throw new Error("socket reset");
        }

        return new Response("<rss><channel><item>", { status: 200 });
      })
    );
    const onSourceFailure = vi.fn();

    const items = await fetchCategoryFallbackCandidates({
      categoryId: "cloud-infrastructure",
      sources: [
        source({
          name: "Fetch Error Feed",
          rssUrl: "https://broken.example/fetch-error.xml",
          categoryHints: ["cloud-infrastructure"],
          allowedCategories: ["cloud-infrastructure"]
        }),
        source({
          name: "Parse Error Feed",
          rssUrl: "https://broken.example/parse-error.xml",
          categoryHints: ["cloud-infrastructure"],
          allowedCategories: ["cloud-infrastructure"]
        })
      ],
      now: new Date("2026-06-11T13:00:00.000Z"),
      onSourceFailure
    });

    expect(items).toEqual([]);
    expect(onSourceFailure).toHaveBeenCalledTimes(2);
    expect(onSourceFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceName: "Fetch Error Feed",
        error: expect.objectContaining({ message: "socket reset" })
      })
    );
    expect(onSourceFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceName: "Parse Error Feed",
        error: expect.anything()
      })
    );
  });
});
