import { XMLParser } from "fast-xml-parser";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { createNewsId } from "@/lib/news/ids";
import { normalizeTitle } from "@/lib/news/normalizeContent";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import { summarizeCandidate } from "@/lib/news/summarize";
import type { CategoryId } from "@/config/categories";
import type { NewsItem } from "@/types/news";

export const ARXIV_CATEGORIES = [
  "cat:cs.AI",
  "cat:cs.LG",
  "cat:cs.CL",
  "cat:cs.CV",
  "cat:cs.RO",
  "cat:cs.DC",
  "cat:cs.OS",
  "cat:cs.CR",
  "cat:cs.SE",
  "cat:cs.HC",
  "cat:cs.SY",
  "cat:stat.ML"
];

const ARXIV_QUERY = ARXIV_CATEGORIES.join("+OR+");
const MAX_RESULTS = 75;

type ArxivEntry = {
  id?: string;
  title?: string;
  summary?: string;
  published?: string;
  updated?: string;
  author?: { name?: string } | Array<{ name?: string }>;
  link?: { href?: string; rel?: string; type?: string } | Array<{ href?: string; rel?: string; type?: string }>;
  category?: { term?: string } | Array<{ term?: string }>;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function parseDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback.toISOString();
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

function paperUrl(entry: ArxivEntry) {
  const links = asArray(entry.link);
  return (
    links.find((link) => link.rel === "alternate")?.href ??
    links.find((link) => link.type === "text/html")?.href ??
    entry.id
  );
}

function categoryForArxivTags(tags: string[], title: string, summary: string): CategoryId {
  const normalized = new Set(tags.map((tag) => tag.toLowerCase()));
  const haystack = `${title} ${summary}`.toLowerCase();

  if (
    normalized.has("cs.dc") ||
    normalized.has("cs.os") ||
    normalized.has("cs.ar") ||
    normalized.has("cs.pf")
  ) {
    return "computer-systems";
  }

  if (normalized.has("cs.ro") || normalized.has("cs.sy") || normalized.has("eess.sy")) {
    return "embedded-systems";
  }

  if (normalized.has("cs.se")) {
    return "developer-tools-open-source";
  }

  if (
    /\b(agent|agents|agentic|autonomous|tool use|tool-use|workflow|multi-agent|llm agent|language model agent)\b/.test(
      haystack
    )
  ) {
    return "automation-agentic-systems";
  }

  return "research-papers";
}

export type ArxivFetchDiagnostics = {
  requestUrl: string;
  rawCount: number;
  parsedCount: number;
};

export type ArxivFetchResult = {
  items: NewsItem[];
  diagnostics: ArxivFetchDiagnostics;
};

export function arxivRequestUrl() {
  return `https://export.arxiv.org/api/query?search_query=${ARXIV_QUERY}&start=0&max_results=${MAX_RESULTS}&sortBy=submittedDate&sortOrder=descending`;
}

export async function fetchArxivPapersWithDiagnostics({
  now = new Date()
}: { now?: Date } = {}): Promise<ArxivFetchResult> {
  const url = arxivRequestUrl();

  const emptyDiagnostics = {
    requestUrl: url,
    rawCount: 0,
    parsedCount: 0
  };

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: {
        "User-Agent": "TechEveryday/0.1 (+https://example.com)"
      }
    });

    if (!response.ok) {
      return {
        items: [],
        diagnostics: emptyDiagnostics
      };
    }

    const xml = await response.text();
    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ""
    }).parse(xml) as { feed?: { entry?: ArxivEntry | ArxivEntry[] } };
    const entries = asArray(parsed.feed?.entry);
    const papers = await Promise.all(
      entries.map(async (entry) => {
        const title = normalizeTitle(entry.title ?? "");
        const url = paperUrl(entry);

        if (!title || !url) {
          return null;
        }

        const tags = asArray(entry.category)
          .map((category) => category.term)
          .filter((term): term is string => Boolean(term));
        const summary = await summarizeCandidate(entry.summary ?? "");
        const category = categoryForArxivTags(tags, title, summary);
        const authors = asArray(entry.author)
          .map((author) => author.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        const publishedAt = parseDate(entry.published || entry.updated, now);

        return scoreNewsItem(
          {
            id: createNewsId(url, title),
            title,
            summary: authors ? `${summary} Authors: ${authors}.` : summary,
            url,
            canonicalUrl: canonicalizeUrl(url),
            sourceName: "arXiv",
            sourceType: "paper",
            category,
            publishedAt,
            foundAt: now.toISOString(),
            imageUrl: placeholderImageForCategory(category, title),
            trustScore: 0.86,
            freshnessScore: 0,
            technicalDepthScore: 0,
            educationalScore: 0,
            practicalUsefulnessScore: 0,
            noveltyScore: 0,
            finalScore: 0,
            saved: false,
            tags: Array.from(new Set(["arxiv", ...tags])).slice(0, 6),
            keyClaims: [],
            whyItMatters: ""
          } satisfies NewsItem,
          now
        );
      })
    );
    const items = papers.filter(Boolean) as NewsItem[];

    return {
      items,
      diagnostics: {
        requestUrl: url,
        rawCount: entries.length,
        parsedCount: items.length
      }
    };
  } catch {
    return {
      items: [],
      diagnostics: emptyDiagnostics
    };
  }
}

export async function fetchArxivPapers({ now = new Date() }: { now?: Date } = {}) {
  const result = await fetchArxivPapersWithDiagnostics({ now });
  return result.items;
}
