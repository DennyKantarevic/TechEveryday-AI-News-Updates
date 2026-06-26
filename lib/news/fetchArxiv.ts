import { XMLParser, XMLValidator } from "fast-xml-parser";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { createNewsId } from "@/lib/news/ids";
import { normalizeTitle } from "@/lib/news/normalizeContent";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import { summarizeCandidate } from "@/lib/news/summarize";
import type { CategoryId, RequiredSectionId } from "@/config/categories";
import type { NewsItem } from "@/types/news";

export const ARXIV_CATEGORIES = [
  "cat:cs.AI",
  "cat:cs.LG",
  "cat:cs.CL",
  "cat:cs.CV",
  "cat:cs.RO",
  "cat:cs.DC",
  "cat:cs.OS",
  "cat:cs.AR",
  "cat:cs.PF",
  "cat:cs.CR",
  "cat:cs.SE",
  "cat:cs.HC",
  "cat:cs.SY",
  "cat:eess.SY",
  "cat:stat.ML"
];

const ARXIV_QUERY = ARXIV_CATEGORIES.join(" OR ");
const MAX_RESULTS = 75;
const TARGETED_MAX_RESULTS = 60;

const ARXIV_CATEGORY_QUERIES: Record<RequiredSectionId, string> = {
  "ai-ml": "(cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.CV OR cat:stat.ML)",
  "automation-agentic-systems":
    '((cat:cs.AI OR cat:cs.LG OR cat:cs.CL OR cat:cs.SE) AND (all:agent OR all:agentic OR all:"tool use" OR all:"multi-agent" OR all:"workflow automation"))',
  "embedded-systems": "(cat:cs.RO OR cat:cs.SY OR cat:eess.SY)",
  "computer-systems": "(cat:cs.DC OR cat:cs.OS OR cat:cs.AR OR cat:cs.PF)",
  "developer-tools-open-source":
    '((cat:cs.SE) AND (all:"developer tool" OR all:compiler OR all:debugger OR all:testing OR all:"build system"))',
  "cloud-infrastructure":
    '((cat:cs.DC OR cat:cs.NI OR cat:cs.PF) AND (all:"cloud computing" OR all:kubernetes OR all:serverless OR all:observability))'
};

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
    /\b(agent|agents|agentic|autonomous agent|tool use|tool-use|multi-agent|llm agent|language model agent|workflow automation)\b/.test(
      haystack
    )
  ) {
    return "automation-agentic-systems";
  }

  if (normalized.has("cs.se")) {
    return "developer-tools-open-source";
  }

  if (normalized.has("cs.ro") || normalized.has("cs.sy") || normalized.has("eess.sy")) {
    return "embedded-systems";
  }

  if (
    /\b(cloud computing|cloud infrastructure|kubernetes|serverless|observability platform)\b/.test(
      haystack
    )
  ) {
    return "cloud-infrastructure";
  }

  if (
    normalized.has("cs.dc") ||
    normalized.has("cs.os") ||
    normalized.has("cs.ar") ||
    normalized.has("cs.pf")
  ) {
    return "computer-systems";
  }

  if (
    normalized.has("cs.ai") ||
    normalized.has("cs.lg") ||
    normalized.has("cs.cl") ||
    normalized.has("cs.cv") ||
    normalized.has("stat.ml")
  ) {
    return "ai-ml";
  }

  if (
    /\b(operating system|kernel|compiler|storage|database|distributed systems?|memory management|runtime scheduler|computer architecture)\b/.test(
      haystack
    )
  ) {
    return "computer-systems";
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

export type ArxivCategoryFetchResult = {
  items: NewsItem[];
  failure?: unknown;
};

type ArxivFetchAttempt = ArxivFetchResult & {
  failure?: unknown;
};

function requestUrl(searchQuery: string, maxResults: number) {
  const url = new URL("https://export.arxiv.org/api/query");
  url.searchParams.set("search_query", searchQuery);
  url.searchParams.set("start", "0");
  url.searchParams.set("max_results", String(maxResults));
  url.searchParams.set("sortBy", "submittedDate");
  url.searchParams.set("sortOrder", "descending");
  return url.toString();
}

async function fetchArxivUrlWithDiagnostics(url: string, now: Date): Promise<ArxivFetchAttempt> {
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
        diagnostics: emptyDiagnostics,
        failure: new Error(
          `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`
        )
      };
    }

    const xml = await response.text();
    const validation = XMLValidator.validate(xml);
    if (validation !== true) {
      throw new Error(`Invalid XML: ${validation.err.msg}`);
    }

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
  } catch (error) {
    return {
      items: [],
      diagnostics: emptyDiagnostics,
      failure: error
    };
  }
}

export function arxivRequestUrl() {
  return requestUrl(ARXIV_QUERY, MAX_RESULTS);
}

export function arxivCategoryRequestUrl(categoryId: RequiredSectionId) {
  return requestUrl(ARXIV_CATEGORY_QUERIES[categoryId], TARGETED_MAX_RESULTS);
}

export async function fetchArxivPapersWithDiagnostics({
  now = new Date()
}: { now?: Date } = {}): Promise<ArxivFetchResult> {
  const { items, diagnostics } = await fetchArxivUrlWithDiagnostics(arxivRequestUrl(), now);
  return { items, diagnostics };
}

export async function fetchArxivPapers({ now = new Date() }: { now?: Date } = {}) {
  const result = await fetchArxivPapersWithDiagnostics({ now });
  return result.items;
}

export async function fetchArxivCategoryCandidates({
  categoryId,
  now = new Date()
}: {
  categoryId: RequiredSectionId;
  now?: Date;
}): Promise<ArxivCategoryFetchResult> {
  const result = await fetchArxivUrlWithDiagnostics(arxivCategoryRequestUrl(categoryId), now);
  return {
    items: result.items.filter((item) => item.category === categoryId),
    ...(result.failure ? { failure: result.failure } : {})
  };
}
