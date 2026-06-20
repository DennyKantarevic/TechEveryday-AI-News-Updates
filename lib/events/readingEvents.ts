import type { CategoryId } from "@/config/categories";
import type { InteractionEvent, InteractionType } from "@/lib/interactions";

export type ReadingEventRow = {
  id: string;
  article_id: string;
  article_url: string | null;
  category: string | null;
  event_type: string;
  source_name: string | null;
  tags: string[];
  created_at: string;
  event_payload?: Partial<InteractionEvent> | null;
};

export function readingEventRowToInteractionEvent(row: ReadingEventRow): InteractionEvent {
  const payload = row.event_payload ?? {};

  return {
    id: row.id,
    type: (payload.type ?? row.event_type) as InteractionType,
    createdAt: payload.createdAt ?? row.created_at,
    articleId: payload.articleId ?? row.article_id,
    article: payload.article,
    category: (payload.category ?? row.category ?? undefined) as CategoryId | undefined,
    sourceType: payload.sourceType
  };
}

export function interactionEventToReadingEventRow(userId: string, event: InteractionEvent) {
  return {
    user_id: userId,
    article_id: event.articleId ?? event.category ?? event.type,
    article_url: event.article?.url ?? null,
    category: event.category ?? event.article?.category ?? null,
    event_type: event.type,
    source_name: event.article?.sourceName ?? null,
    tags: event.article?.tags ?? [],
    event_payload: event
  };
}
