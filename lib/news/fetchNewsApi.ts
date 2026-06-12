import { TRUSTED_SOURCES } from "@/config/sources";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { classifyCategory } from "@/lib/news/classify";
import { createNewsId } from "@/lib/news/ids";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import { summarizeCandidate } from "@/lib/news/summarize";
import type { NewsItem } from "@/types/news";

type NewsApiArticle = {
  source?: { name?: string };
  author?: string | null;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  urlToImage?: string | null;
  publishedAt?: string | null;
  content?: string | null;
};

type NewsApiResponse = {
  status?: string;
  articles?: NewsApiArticle[];
};

function trustedDomains() {
  return Array.from(
    new Set(
      TRUSTED_SOURCES.filter((source) => !source.discoveryOnly && source.sourceType !== "paper")
        .map((source) => {
          try {
            return new URL(source.homepageUrl).hostname.replace(/^www\./, "");
          } catch {
            return undefined;
          }
        })
        .filter((domain): domain is string => Boolean(domain))
    )
  ).slice(0, 20);
}

function sinceIso(now: Date) {
  return new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();
}

export async function fetchNewsApiCandidates({ now = new Date() }: { now?: Date } = {}) {
  const apiKey = process.env.NEWS_API_KEY?.trim();

  if (!apiKey) {
    return [];
  }

  const url = new URL("https://newsapi.org/v2/everything");
  url.searchParams.set(
    "q",
    [
      "\"machine learning\"",
      "\"developer tools\"",
      "\"cloud infrastructure\"",
      "\"distributed systems\"",
      "\"embedded systems\"",
      "arxiv",
      "benchmark",
      "architecture"
    ].join(" OR ")
  );
  url.searchParams.set("domains", trustedDomains().join(","));
  url.searchParams.set("from", sinceIso(now));
  url.searchParams.set("sortBy", "publishedAt");
  url.searchParams.set("pageSize", "50");
  url.searchParams.set("language", "en");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(9000),
      headers: {
        "X-Api-Key": apiKey,
        "User-Agent": "TechEveryday/0.1 (+https://example.com)"
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as NewsApiResponse;
    const articles = payload.articles ?? [];
    const items = await Promise.all(
      articles.map(async (article) => {
        const title = article.title?.trim();
        const articleUrl = article.url?.trim();

        if (!title || !articleUrl) {
          return null;
        }

        const sourceName = article.source?.name?.trim() || "NewsAPI source";
        const summary = await summarizeCandidate(
          [article.description, article.content].filter(Boolean).join(" ")
        );
        const category = classifyCategory({
          title,
          summary,
          sourceName,
          sourceType: "news",
          tags: [article.author ?? ""].filter(Boolean)
        });
        const imageUrl =
          article.urlToImage?.trim() || placeholderImageForCategory(category, title);

        return scoreNewsItem(
          {
            id: createNewsId(articleUrl, title),
            title,
            summary,
            url: articleUrl,
            canonicalUrl: canonicalizeUrl(articleUrl),
            sourceName,
            sourceType: "news",
            category,
            publishedAt: article.publishedAt ?? "",
            foundAt: now.toISOString(),
            imageUrl,
            trustScore: 0.78,
            freshnessScore: 0,
            technicalDepthScore: 0,
            educationalScore: 0,
            practicalUsefulnessScore: 0,
            noveltyScore: 0,
            finalScore: 0,
            saved: false,
            tags: Array.from(new Set(["newsapi", category])).slice(0, 6),
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
