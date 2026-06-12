import { CATEGORY_BY_ID, CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { TRUSTED_SOURCES } from "@/config/sources";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import type { CategoryId } from "@/config/categories";
import type { DailyNews, NewsItem } from "@/types/news";

const FALLBACK_SOURCES: Partial<Record<CategoryId, Array<{ name: string; url: string }>>> = {
  "research-papers": [
    { name: "arXiv", url: "https://arxiv.org/list/cs/recent" },
    { name: "Communications of the ACM", url: "https://cacm.acm.org/" },
    { name: "Microsoft Research Blog", url: "https://www.microsoft.com/en-us/research/blog/" }
  ]
};

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function starterItemsForCategory(categoryId: CategoryId, now: Date): NewsItem[] {
  const category = CATEGORY_BY_ID[categoryId];
  const sourceMatches = TRUSTED_SOURCES.filter((source) =>
    source.categoryHints.includes(categoryId)
  ).slice(0, 3);
  const sources =
    sourceMatches.length > 0
      ? sourceMatches.map((source) => ({
          name: source.name,
          url: source.homepageUrl,
          sourceType: source.sourceType,
          trustScore: source.trustScore
        }))
      : (FALLBACK_SOURCES[categoryId] ?? []).map((source) => ({
          name: source.name,
          url: source.url,
          sourceType: categoryId === "research-papers" ? ("paper" as const) : ("news" as const),
          trustScore: 0.84
        }));

  return sources.map((source) =>
    scoreNewsItem(
      {
        id: `starter-${categoryId}-${slug(source.name)}`,
        title: `${source.name} trusted ${category.title} source`,
        summary:
          "Starter content identifies a trusted source but is not used to fill the current daily feed.",
        url: source.url,
        canonicalUrl: canonicalizeUrl(source.url),
        sourceName: source.name,
        sourceType: source.sourceType,
        category: categoryId,
        publishedAt: now.toISOString(),
        foundAt: now.toISOString(),
        imageUrl: placeholderImageForCategory(categoryId, source.name),
        trustScore: source.trustScore,
        freshnessScore: 0,
        technicalDepthScore: 0,
        educationalScore: 0,
        practicalUsefulnessScore: 0,
        noveltyScore: 0,
        finalScore: 0,
        saved: false,
        tags: ["starter", categoryId],
        keyClaims: [],
        whyItMatters: ""
      },
      now
    )
  );
}

export function createStarterDailyNews(now = new Date(0)): DailyNews {
  return {
    refreshedAt: now.toISOString(),
    timezone: "America/New_York",
    categories: createCategoryRecord((categoryId) =>
      starterItemsForCategory(categoryId, now).slice(0, 3)
    )
  };
}

export function categoriesWithStarterFallback(
  categories: DailyNews["categories"],
  now = new Date()
) {
  const starter = createStarterDailyNews(now);

  return createCategoryRecord((categoryId) =>
    categories[categoryId]?.length ? categories[categoryId] : starter.categories[categoryId]
  );
}
