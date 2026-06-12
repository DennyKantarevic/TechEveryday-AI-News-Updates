import { CATEGORY_IDS } from "@/config/categories";
import type { CategoryId } from "@/config/categories";
import type { NewsItem, SourceType } from "@/types/news";

const SOURCE_TYPES = new Set<SourceType>([
  "official",
  "news",
  "paper",
  "blog",
  "discovery",
  "x"
]);
const CATEGORY_SET = new Set<string>(CATEGORY_IDS);

export type SavedArticleRow = {
  article_id: string;
  article_url: string;
  title: string;
  source_name: string | null;
  category: string | null;
  summary: string | null;
  image_url: string | null;
  saved_at: string;
  article_payload?: Partial<NewsItem> | null;
};

function isCategory(value: unknown): value is CategoryId {
  return typeof value === "string" && CATEGORY_SET.has(value);
}

function isSourceType(value: unknown): value is SourceType {
  return typeof value === "string" && SOURCE_TYPES.has(value as SourceType);
}

function numericScore(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function savedArticleRowToNewsItem(row: SavedArticleRow): NewsItem {
  const payload = row.article_payload ?? {};
  const savedAt = row.saved_at || new Date().toISOString();
  const category = isCategory(payload.category)
    ? payload.category
    : isCategory(row.category)
      ? row.category
      : "developer-tools-open-source";

  return {
    id: payload.id || row.article_id,
    title: payload.title || row.title,
    summary: payload.summary || row.summary || "Saved article.",
    url: payload.url || row.article_url,
    canonicalUrl: payload.canonicalUrl || payload.url || row.article_url,
    sourceName: payload.sourceName || row.source_name || "Saved source",
    sourceType: isSourceType(payload.sourceType) ? payload.sourceType : "news",
    category,
    publishedAt: payload.publishedAt || savedAt,
    foundAt: payload.foundAt || savedAt,
    imageUrl: payload.imageUrl || row.image_url || undefined,
    trustScore: numericScore(payload.trustScore, 0.8),
    freshnessScore: numericScore(payload.freshnessScore, 0),
    technicalDepthScore: numericScore(payload.technicalDepthScore, 0),
    educationalScore: numericScore(payload.educationalScore, 0),
    practicalUsefulnessScore: numericScore(payload.practicalUsefulnessScore, 0),
    noveltyScore: numericScore(payload.noveltyScore, 0),
    finalScore: numericScore(payload.finalScore, 0),
    saved: true,
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    keyClaims: Array.isArray(payload.keyClaims) ? payload.keyClaims : [],
    whyItMatters:
      payload.whyItMatters ||
      row.summary ||
      payload.summary ||
      "Saved for later reading."
  };
}

export function newsItemToSavedArticleRow(userId: string, item: NewsItem) {
  return {
    user_id: userId,
    article_id: item.id,
    article_url: item.url,
    title: item.title,
    source_name: item.sourceName,
    category: item.category,
    summary: item.summary,
    image_url: item.imageUrl ?? null,
    article_payload: { ...item, saved: true }
  };
}
