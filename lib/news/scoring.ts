import { CATEGORY_BY_ID } from "@/config/categories";
import { scoreContentQuality } from "@/lib/news/classify";
import { evaluateFreshness } from "@/lib/news/freshness";
import { summarizeText } from "@/lib/news/summarize";
import type { NewsItem } from "@/types/news";

export function canonicalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|ref_src$)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return url.trim();
  }
}

function sentenceClaims(title: string, summary: string) {
  const claims = summarizeText(summary, 2)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .slice(0, 2);

  return claims.length ? claims : [title];
}

function whyItMattersFor(item: Pick<NewsItem, "category" | "sourceType" | "title">) {
  const category = CATEGORY_BY_ID[item.category]?.title ?? "technology";
  const sourceContext =
    item.sourceType === "paper"
      ? "primary research"
      : item.sourceType === "official"
        ? "official technical coverage"
        : "trusted coverage";

  return `This ${sourceContext} helps readers understand current ${category} work without relying on stale or invented context.`;
}

export function scoreNewsItem(
  item: Omit<
    NewsItem,
    | "canonicalUrl"
    | "freshnessScore"
    | "technicalDepthScore"
    | "educationalScore"
    | "practicalUsefulnessScore"
    | "noveltyScore"
    | "finalScore"
    | "keyClaims"
    | "whyItMatters"
  > &
    Partial<
      Pick<
        NewsItem,
        | "canonicalUrl"
        | "freshnessScore"
        | "technicalDepthScore"
        | "educationalScore"
        | "practicalUsefulnessScore"
        | "noveltyScore"
        | "finalScore"
        | "keyClaims"
        | "whyItMatters"
      >
    >,
  now = new Date()
): NewsItem {
  const freshness = evaluateFreshness({ publishedAt: item.publishedAt, now });
  const quality = scoreContentQuality(item as NewsItem);
  const sourceTrustScore = Math.max(0, Math.min(5, item.trustScore * 5));
  const categoryFitScore = Math.min(5, quality.technicalDepthScore + quality.educationalScore);
  const finalScore =
    freshness.freshnessScore * 0.18 +
    sourceTrustScore * 0.18 +
    quality.technicalDepthScore * 0.22 +
    quality.educationalScore * 0.18 +
    quality.practicalUsefulnessScore * 0.16 +
    categoryFitScore * 0.08 -
    quality.noveltyScore * 0.22;

  return {
    ...item,
    canonicalUrl: item.canonicalUrl ?? canonicalizeUrl(item.url),
    freshnessScore: freshness.freshnessScore,
    technicalDepthScore: quality.technicalDepthScore,
    educationalScore: quality.educationalScore,
    practicalUsefulnessScore: quality.practicalUsefulnessScore,
    noveltyScore: quality.noveltyScore,
    finalScore: Number(finalScore.toFixed(3)),
    keyClaims: item.keyClaims?.length ? item.keyClaims : sentenceClaims(item.title, item.summary),
    whyItMatters: item.whyItMatters?.trim() || whyItMattersFor(item)
  };
}
