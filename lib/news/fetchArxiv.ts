import { XMLParser } from "fast-xml-parser";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { createNewsId } from "@/lib/news/ids";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import { summarizeCandidate, stripMarkup } from "@/lib/news/summarize";
import type { NewsItem } from "@/types/news";

const ARXIV_QUERY = [
  "cat:cs.AI",
  "cat:cs.LG",
  "cat:cs.CL",
  "cat:cs.DC",
  "cat:cs.OS",
  "cat:cs.CR",
  "cat:cs.SE",
  "cat:cs.HC",
  "cat:cs.RO"
].join("+OR+");

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

export async function fetchArxivPapers({ now = new Date() }: { now?: Date } = {}) {
  const url = `https://export.arxiv.org/api/query?search_query=${ARXIV_QUERY}&start=0&max_results=35&sortBy=submittedDate&sortOrder=descending`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: {
        "User-Agent": "TechEveryday/0.1 (+https://example.com)"
      }
    });

    if (!response.ok) {
      return [];
    }

    const xml = await response.text();
    const parsed = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: ""
    }).parse(xml) as { feed?: { entry?: ArxivEntry | ArxivEntry[] } };
    const entries = asArray(parsed.feed?.entry);
    const papers = await Promise.all(
      entries.map(async (entry) => {
        const title = stripMarkup(entry.title ?? "").replace(/\s+/g, " ").trim();
        const url = paperUrl(entry);

        if (!title || !url) {
          return null;
        }

        const tags = asArray(entry.category)
          .map((category) => category.term)
          .filter((term): term is string => Boolean(term));
        const summary = await summarizeCandidate(entry.summary ?? "");
        const authors = asArray(entry.author)
          .map((author) => author.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");

        return scoreNewsItem(
          {
            id: createNewsId(url, title),
            title,
            summary: authors ? `${summary} Authors: ${authors}.` : summary,
            url,
            canonicalUrl: canonicalizeUrl(url),
            sourceName: "arXiv",
            sourceType: "paper",
            category: "research-papers",
            publishedAt: parseDate(entry.published || entry.updated, now),
            foundAt: now.toISOString(),
            imageUrl: placeholderImageForCategory("research-papers", title),
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

    return papers.filter(Boolean) as NewsItem[];
  } catch {
    return [];
  }
}
