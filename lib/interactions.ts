import type { CategoryId } from "@/config/categories";
import type { NewsItem, SourceType } from "@/types/news";

export const INTERACTIONS_STORAGE_KEY = "techeveryday:interactions:v1";
const MAX_STORED_EVENTS = 250;

export type InteractionType =
  | "article_viewed"
  | "article_opened"
  | "article_saved"
  | "category_visited"
  | "gallery_saved";

export type InteractionArticle = Pick<
  NewsItem,
  | "id"
  | "title"
  | "summary"
  | "sourceName"
  | "sourceType"
  | "category"
  | "publishedAt"
  | "foundAt"
  | "tags"
>;

export type InteractionEvent = {
  id?: string;
  type: InteractionType;
  createdAt: string;
  articleId?: string;
  article?: InteractionArticle;
  category?: CategoryId;
  sourceType?: SourceType;
};

type WritableInteractionEvent = Omit<InteractionEvent, "createdAt"> &
  Partial<Pick<InteractionEvent, "createdAt">>;

function clientStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isInteractionType(value: unknown): value is InteractionType {
  return (
    value === "article_viewed" ||
    value === "article_opened" ||
    value === "article_saved" ||
    value === "category_visited" ||
    value === "gallery_saved"
  );
}

function normalizeArticle(item: NewsItem): InteractionArticle {
  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    sourceName: item.sourceName,
    sourceType: item.sourceType,
    category: item.category,
    publishedAt: item.publishedAt,
    foundAt: item.foundAt,
    tags: item.tags
  };
}

function coerceEvent(value: unknown): InteractionEvent | null {
  if (!isRecord(value) || !isInteractionType(value.type) || typeof value.createdAt !== "string") {
    return null;
  }

  const article = isRecord(value.article)
    ? ({
        id: String(value.article.id ?? ""),
        title: String(value.article.title ?? ""),
        summary: String(value.article.summary ?? ""),
        sourceName: String(value.article.sourceName ?? ""),
        sourceType: value.article.sourceType,
        category: value.article.category,
        publishedAt: String(value.article.publishedAt ?? ""),
        foundAt: String(value.article.foundAt ?? ""),
        tags: Array.isArray(value.article.tags)
          ? value.article.tags.filter((tag): tag is string => typeof tag === "string")
          : []
      } as InteractionArticle)
    : undefined;

  return {
    id: typeof value.id === "string" ? value.id : undefined,
    type: value.type,
    createdAt: value.createdAt,
    articleId: typeof value.articleId === "string" ? value.articleId : article?.id,
    article,
    category: typeof value.category === "string" ? (value.category as CategoryId) : article?.category,
    sourceType:
      typeof value.sourceType === "string" ? (value.sourceType as SourceType) : article?.sourceType
  };
}

function normalizeEvent(event: WritableInteractionEvent): InteractionEvent {
  return {
    ...event,
    id:
      event.id ??
      `${event.type}:${event.articleId ?? event.category ?? "event"}:${Date.now().toString(36)}`,
    createdAt: event.createdAt ?? new Date().toISOString(),
    articleId: event.articleId ?? event.article?.id,
    category: event.category ?? event.article?.category,
    sourceType: event.sourceType ?? event.article?.sourceType
  };
}

export function readInteractionEvents(storage = clientStorage()): InteractionEvent[] {
  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(INTERACTIONS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(coerceEvent).filter((event): event is InteractionEvent => Boolean(event));
  } catch {
    return [];
  }
}

export function writeInteractionEvents(
  events: InteractionEvent[],
  storage = clientStorage()
): InteractionEvent[] {
  const normalized = events
    .map(coerceEvent)
    .filter((event): event is InteractionEvent => Boolean(event))
    .slice(0, MAX_STORED_EVENTS);

  if (storage) {
    storage.setItem(INTERACTIONS_STORAGE_KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function recordInteractionEvent(
  event: WritableInteractionEvent,
  storage = clientStorage()
): InteractionEvent {
  const normalized = normalizeEvent(event);
  writeInteractionEvents([normalized, ...readInteractionEvents(storage)], storage);
  return normalized;
}

export function clearInteractionEvents(storage = clientStorage()) {
  if (storage) {
    storage.removeItem(INTERACTIONS_STORAGE_KEY);
  }
}

export function trackArticleViewed(item: NewsItem) {
  return recordInteractionEvent({
    type: "article_viewed",
    articleId: item.id,
    article: normalizeArticle(item)
  });
}

export function trackArticleOpened(item: NewsItem) {
  return recordInteractionEvent({
    type: "article_opened",
    articleId: item.id,
    article: normalizeArticle(item)
  });
}

export function trackArticleSaved(item: NewsItem) {
  return recordInteractionEvent({
    type: "article_saved",
    articleId: item.id,
    article: normalizeArticle(item)
  });
}

export function trackGallerySaved(item: NewsItem) {
  return recordInteractionEvent({
    type: "gallery_saved",
    articleId: item.id,
    article: normalizeArticle(item)
  });
}

export function trackCategoryVisited(category: CategoryId) {
  return recordInteractionEvent({
    type: "category_visited",
    category
  });
}
