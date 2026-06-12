import { CATEGORY_BY_ID } from "@/config/categories";
import { scoreContentQuality } from "@/lib/news/classify";
import { evaluateFreshness } from "@/lib/news/freshness";
import { normalizeSummary, normalizeTitle } from "@/lib/news/normalizeContent";
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

function cleanWhySentence(input: string) {
  return normalizeSummary(input)
    .replace(/\s*Authors?:\s*[^.]+\.?$/i, "")
    .replace(/^(this article|this post|this paper)\s+/i, "")
    .trim();
}

function usefulWhyCandidate(summary: string, title: string) {
  const candidates = summarizeText(summary, 2)
    .split(/(?<=[.!?])\s+/)
    .map(cleanWhySentence)
    .filter((sentence) => sentence.length >= 45)
    .filter(
      (sentence) =>
        !/no source excerpt was provided|open the original source/i.test(sentence)
    );

  return candidates[0] ?? normalizeTitle(title);
}

function whyPrefix(sourceType: NewsItem["sourceType"]) {
  if (sourceType === "paper") {
    return "Read this for the paper's specific claim";
  }

  if (sourceType === "official") {
    return "Read this for the official technical update";
  }

  if (sourceType === "blog") {
    return "Read this for the engineering context";
  }

  return "Read this for the concrete reporting";
}

function whyItMattersFor(
  item: Pick<NewsItem, "category" | "sourceType" | "title" | "summary">
) {
  const category = CATEGORY_BY_ID[item.category]?.title ?? "technology";
  const candidate = usefulWhyCandidate(item.summary, item.title);

  return `${whyPrefix(item.sourceType)} in ${category}: ${candidate}`;
}

function isGenericWhyItMatters(input: string) {
  return (
    !input.trim() ||
    /future of technology|useful insights|progress in ai/i.test(input) ||
    /helps readers understand current .* work without relying on stale or invented context/i.test(
      input
    )
  );
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
  const normalizedItem = {
    ...item,
    title: normalizeTitle(item.title),
    summary: normalizeSummary(item.summary)
  };
  const freshness = evaluateFreshness({ publishedAt: normalizedItem.publishedAt, now });
  const quality = scoreContentQuality(normalizedItem as NewsItem);
  const sourceTrustScore = Math.max(0, Math.min(5, normalizedItem.trustScore * 5));
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
    ...normalizedItem,
    canonicalUrl: normalizedItem.canonicalUrl ?? canonicalizeUrl(normalizedItem.url),
    freshnessScore: freshness.freshnessScore,
    technicalDepthScore: quality.technicalDepthScore,
    educationalScore: quality.educationalScore,
    practicalUsefulnessScore: quality.practicalUsefulnessScore,
    noveltyScore: quality.noveltyScore,
    finalScore: Number(finalScore.toFixed(3)),
    keyClaims: normalizedItem.keyClaims?.length
      ? normalizedItem.keyClaims.map(normalizeSummary)
      : sentenceClaims(normalizedItem.title, normalizedItem.summary),
    whyItMatters: isGenericWhyItMatters(normalizedItem.whyItMatters ?? "")
      ? whyItMattersFor(normalizedItem)
      : normalizeSummary(normalizedItem.whyItMatters ?? "")
  };
}
