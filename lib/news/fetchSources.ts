import Parser from "rss-parser";
import { TRUSTED_SOURCES } from "@/config/sources";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { classifyCategory } from "@/lib/news/classify";
import { createNewsId } from "@/lib/news/ids";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import { summarizeCandidate } from "@/lib/news/summarize";
import type { TrustedSourceConfig } from "@/config/sources";
import type { NewsItem } from "@/types/news";

type CustomItem = Parser.Item & {
  contentEncoded?: string;
  mediaContent?: unknown;
  mediaThumbnail?: unknown;
};

type RssTrustedSourceConfig = TrustedSourceConfig & { rssUrl: string };

const parser = new Parser<Record<string, unknown>, CustomItem>({
  customFields: {
    item: [
      ["content:encoded", "contentEncoded"],
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail"]
    ]
  }
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function getNestedUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const attributes = record.$ as Record<string, unknown> | undefined;
  const url = record.url ?? record.href ?? attributes?.url ?? attributes?.href;

  return typeof url === "string" ? url : undefined;
}

function extractImageUrl(item: CustomItem) {
  if (item.enclosure?.url) {
    return item.enclosure.url;
  }

  const mediaContent = asArray(item.mediaContent).map(getNestedUrl).find(Boolean);
  if (mediaContent) {
    return mediaContent;
  }

  const mediaThumbnail = asArray(item.mediaThumbnail).map(getNestedUrl).find(Boolean);
  if (mediaThumbnail) {
    return mediaThumbnail;
  }

  const html = [item.contentEncoded, item.content].filter(Boolean).join(" ");
  const imageMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return imageMatch?.[1];
}

function usefulImageUrl(url: string | undefined) {
  const trimmed = url?.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/pixel|spacer|tracking|avatar|logo/i.test(trimmed)) {
    return undefined;
  }

  return trimmed;
}

function articleImageUrl(item: CustomItem, source: TrustedSourceConfig) {
  if (!source.preferArticleImages) {
    return undefined;
  }

  return usefulImageUrl(extractImageUrl(item));
}

function parseDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

async function fetchFeed(source: RssTrustedSourceConfig, now: Date): Promise<NewsItem[]> {
  try {
    const response = await fetch(source.rssUrl, {
      signal: AbortSignal.timeout(8500),
      headers: {
        "User-Agent": "TechEveryday/0.1 (+https://example.com)"
      }
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const feed = await parser.parseString(xml);
    const items = await Promise.all(
      feed.items.slice(0, 16).map(async (item) => {
        const title = item.title?.trim();
        const url = item.link || item.guid;

        if (!title || !url) {
          return null;
        }

        const excerpt = item.contentSnippet || item.content || item.contentEncoded || "";
        const summary = await summarizeCandidate(excerpt);
        const category = classifyCategory({
          title,
          summary,
          sourceName: source.name,
          sourceType: source.sourceType,
          hints: source.categoryHints,
          tags: item.categories
        });
        const publishedAt = parseDate(item.isoDate || item.pubDate, now);
        const imageUrl =
          articleImageUrl(item, source) ?? placeholderImageForCategory(category, title);

        return scoreNewsItem(
          {
            id: createNewsId(url, title),
            title,
            summary,
            url,
            canonicalUrl: canonicalizeUrl(url),
            sourceName: source.name,
            sourceType: source.sourceType,
            category,
            publishedAt,
            foundAt: now.toISOString(),
            imageUrl,
            trustScore: source.trustScore,
            freshnessScore: 0,
            technicalDepthScore: 0,
            educationalScore: 0,
            practicalUsefulnessScore: 0,
            noveltyScore: 0,
            finalScore: 0,
            saved: false,
            tags: Array.from(
              new Set([
                category,
                ...(source.discoveryOnly ? ["discovery"] : []),
                ...(item.categories ?? [])
              ])
            ).slice(0, 6),
            keyClaims: [],
            whyItMatters: ""
          } satisfies NewsItem,
          now
        );
      })
    );

    return items.filter(Boolean) as NewsItem[];
  } catch {
    return [];
  }
}

export async function fetchSourceCandidates({
  sources = TRUSTED_SOURCES,
  now = new Date()
}: {
  sources?: TrustedSourceConfig[];
  now?: Date;
} = {}) {
  const rssSources = sources.filter(
    (source): source is RssTrustedSourceConfig => Boolean(source.rssUrl)
  );
  const results = await Promise.allSettled(rssSources.map((source) => fetchFeed(source, now)));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}
