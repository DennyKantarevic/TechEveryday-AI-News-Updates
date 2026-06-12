import { CATEGORY_BY_ID, CATEGORY_IDS } from "@/config/categories";
import type { CategoryId } from "@/config/categories";
import type { InteractionEvent, InteractionType } from "@/lib/interactions";
import type { NewsItem, SourceType } from "@/types/news";

const DEFAULT_LIMIT = 12;
const ACTIVE_CATEGORY_IDS = new Set<string>(CATEGORY_IDS);
const REMOVED_TOPIC_SIGNALS = new Set(["cybersecurity", "cyber security"]);

const EVENT_WEIGHTS: Record<InteractionType, number> = {
  article_saved: 6,
  gallery_saved: 6,
  article_opened: 3,
  article_viewed: 2,
  category_visited: 1.5
};

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "and",
  "are",
  "article",
  "because",
  "been",
  "being",
  "from",
  "guide",
  "has",
  "have",
  "help",
  "helps",
  "how",
  "into",
  "its",
  "new",
  "news",
  "now",
  "over",
  "teams",
  "that",
  "the",
  "their",
  "this",
  "through",
  "update",
  "uses",
  "with",
  "work"
]);

type WeightedSignal = {
  label: string;
  total: number;
  saved: number;
};

type InterestProfile = {
  categories: Map<CategoryId, WeightedSignal>;
  sourceTypes: Map<SourceType, WeightedSignal>;
  tags: Map<string, WeightedSignal>;
  keywords: Map<string, WeightedSignal>;
  savedArticleIds: Set<string>;
};

export type Recommendation = {
  item: NewsItem;
  score: number;
  interestScore: number;
  freshnessScore: number;
  reason: string;
  matchedSignals: string[];
};

export type RecommendationInput = {
  articles: NewsItem[];
  events: InteractionEvent[];
  limit?: number;
  now?: Date;
};

export type FoundationalLearningItem = {
  id: string;
  title: string;
  deck: string;
  categoryIds: readonly CategoryId[];
  tags?: readonly string[];
};

export type FoundationalLearningRecommendation = {
  item: FoundationalLearningItem;
  score: number;
  reason: string;
  matchedSignals: string[];
};

export type FoundationalLearningInput = {
  foundations: readonly FoundationalLearningItem[];
  events: InteractionEvent[];
  limit?: number;
};

function eventWeight(type: InteractionType) {
  return EVENT_WEIGHTS[type] ?? 0;
}

function isSaveEvent(event: InteractionEvent) {
  return event.type === "article_saved" || event.type === "gallery_saved";
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function keywordTokens(value: string) {
  return normalizeToken(value)
    .split(/\s+/)
    .filter((token) => token && (token.length > 2 || token === "ai" || token === "ml"))
    .filter((token) => !STOP_WORDS.has(token));
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function normalizedTag(tag: string) {
  return normalizeToken(tag);
}

function isActiveCategory(value: unknown): value is CategoryId {
  return typeof value === "string" && ACTIVE_CATEGORY_IDS.has(value);
}

function isActiveTopicSignal(value: string) {
  return !REMOVED_TOPIC_SIGNALS.has(normalizedTag(value));
}

function addSignal<K>(
  map: Map<K, WeightedSignal>,
  key: K | undefined,
  label: string | undefined,
  weight: number,
  saved: boolean
) {
  if (!key || !label || weight <= 0) {
    return;
  }

  const current = map.get(key) ?? { label, total: 0, saved: 0 };
  current.total += weight;
  if (saved) {
    current.saved += weight;
  }
  map.set(key, current);
}

function sourceTypeLabel(type: SourceType) {
  if (type === "paper") {
    return "primary research";
  }
  if (type === "official") {
    return "official source";
  }
  if (type === "blog") {
    return "technical blog";
  }
  if (type === "x") {
    return "X post";
  }
  return "trusted news";
}

function buildInterestProfile(events: InteractionEvent[]): InterestProfile {
  const profile: InterestProfile = {
    categories: new Map(),
    sourceTypes: new Map(),
    tags: new Map(),
    keywords: new Map(),
    savedArticleIds: new Set()
  };

  for (const event of events) {
    const weight = eventWeight(event.type);
    const saved = isSaveEvent(event);

    if (saved && event.articleId) {
      profile.savedArticleIds.add(event.articleId);
    }

    const rawCategory = event.category ?? event.article?.category;
    const category = isActiveCategory(rawCategory) ? rawCategory : undefined;

    if (!category && rawCategory) {
      continue;
    }

    addSignal(profile.categories, category, category ? CATEGORY_BY_ID[category]?.title : undefined, weight, saved);

    const sourceType = event.sourceType ?? event.article?.sourceType;
    addSignal(profile.sourceTypes, sourceType, sourceType ? sourceTypeLabel(sourceType) : undefined, weight, saved);

    if (!event.article) {
      continue;
    }

    for (const tag of event.article.tags.filter(isActiveTopicSignal)) {
      addSignal(profile.tags, normalizedTag(tag), tag, weight, saved);
    }

    const text = `${event.article.title} ${event.article.summary}`;
    for (const token of unique(keywordTokens(text))) {
      addSignal(profile.keywords, token, token, weight, saved);
    }
  }

  return profile;
}

function scoreMapSignals<K>(map: Map<K, WeightedSignal>, keys: K[], multiplier: number) {
  let score = 0;
  const matched: WeightedSignal[] = [];

  for (const key of unique(keys)) {
    const signal = map.get(key);
    if (!signal) {
      continue;
    }

    score += signal.total * multiplier;
    matched.push(signal);
  }

  return { score, matched };
}

function dateValue(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function freshnessScore(item: NewsItem, now: Date) {
  const published = dateValue(item.publishedAt);
  const found = dateValue(item.foundAt);
  const itemTime = Math.max(published, found);

  if (!itemTime) {
    return 0;
  }

  const daysOld = Math.max(0, (now.getTime() - itemTime) / 86_400_000);
  if (daysOld <= 1) {
    return 4;
  }
  if (daysOld <= 7) {
    return 2.6;
  }
  if (daysOld <= 30) {
    return 1.1;
  }
  return 0.25;
}

function isFoundationalItem(item: NewsItem) {
  return item.id.startsWith("starter-") || item.tags.some((tag) => normalizedTag(tag) === "starter");
}

function bestSavedSignal(signals: WeightedSignal[]) {
  return signals
    .filter((signal) => signal.saved > 0)
    .sort((a, b) => b.saved - a.saved || b.total - a.total)[0];
}

function bestSignal(signals: WeightedSignal[]) {
  return signals.sort((a, b) => b.total - a.total)[0];
}

function reasonForRecommendation(
  tagMatches: WeightedSignal[],
  categoryMatches: WeightedSignal[],
  keywordMatches: WeightedSignal[],
  sourceMatches: WeightedSignal[]
) {
  const savedTag = bestSavedSignal(tagMatches);
  if (savedTag) {
    return `Recommended because you saved ${savedTag.label} articles.`;
  }

  const savedCategory = bestSavedSignal(categoryMatches);
  if (savedCategory) {
    return `Recommended because you saved ${savedCategory.label} articles.`;
  }

  const savedKeyword = bestSavedSignal(keywordMatches);
  if (savedKeyword) {
    return `Recommended because you saved ${savedKeyword.label} articles.`;
  }

  const category = bestSignal(categoryMatches);
  if (category) {
    return `Recommended because you read ${category.label} coverage.`;
  }

  const tag = bestSignal(tagMatches);
  if (tag) {
    return `Recommended because it matches your recent ${tag.label} reading.`;
  }

  const source = bestSignal(sourceMatches);
  if (source) {
    return `Recommended because you open ${source.label} sources.`;
  }

  return "Recommended because it is fresh and relevant to your interests.";
}

function scoreArticle(item: NewsItem, profile: InterestProfile, now: Date): Recommendation | null {
  if (item.saved || profile.savedArticleIds.has(item.id)) {
    return null;
  }

  const categoryResult = scoreMapSignals(profile.categories, [item.category], 2);
  const sourceResult = scoreMapSignals(profile.sourceTypes, [item.sourceType], 0.75);
  const tagResult = scoreMapSignals(
    profile.tags,
    item.tags.map(normalizedTag),
    2.4
  );
  const titleResult = scoreMapSignals(profile.keywords, keywordTokens(item.title), 1.1);
  const summaryResult = scoreMapSignals(profile.keywords, keywordTokens(item.summary), 0.55);
  const keywordMatches = [...titleResult.matched, ...summaryResult.matched];
  const contentInterestScore =
    categoryResult.score + tagResult.score + titleResult.score + summaryResult.score;
  const interestScore =
    contentInterestScore + sourceResult.score;

  if (interestScore <= 0) {
    return null;
  }

  const foundational = isFoundationalItem(item);
  if (foundational && contentInterestScore <= 0) {
    return null;
  }

  const freshScore = freshnessScore(item, now);
  const fallbackMultiplier = foundational ? 0.72 : 1;
  const score = (interestScore + freshScore) * fallbackMultiplier;

  return {
    item,
    score,
    interestScore,
    freshnessScore: freshScore,
    reason: reasonForRecommendation(
      tagResult.matched,
      categoryResult.matched,
      keywordMatches,
      sourceResult.matched
    ),
    matchedSignals: unique([
      ...categoryResult.matched.map((signal) => signal.label),
      ...tagResult.matched.map((signal) => signal.label),
      ...keywordMatches.map((signal) => signal.label),
      ...sourceResult.matched.map((signal) => signal.label)
    ])
  };
}

export function hasEnoughInteractionData(events: InteractionEvent[]) {
  const meaningfulEvents = events.filter((event) => {
    const rawCategory = event.category ?? event.article?.category;
    return eventWeight(event.type) > 0 && (!rawCategory || isActiveCategory(rawCategory));
  });
  return meaningfulEvents.some(isSaveEvent) || meaningfulEvents.length >= 2;
}

export function getRecommendations({
  articles,
  events,
  limit = DEFAULT_LIMIT,
  now = new Date()
}: RecommendationInput): Recommendation[] {
  const profile = buildInterestProfile(events);

  return articles
    .map((item) => scoreArticle(item, profile, now))
    .filter((recommendation): recommendation is Recommendation => Boolean(recommendation))
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.freshnessScore - a.freshnessScore ||
        dateValue(b.item.publishedAt) - dateValue(a.item.publishedAt) ||
        a.item.title.localeCompare(b.item.title)
    )
    .slice(0, limit);
}

function scoreFoundation(
  item: FoundationalLearningItem,
  profile: InterestProfile
): FoundationalLearningRecommendation | null {
  const categoryResult = scoreMapSignals(profile.categories, [...item.categoryIds], 2);
  const tagResult = scoreMapSignals(
    profile.tags,
    (item.tags ?? []).map(normalizedTag),
    2.4
  );
  const titleResult = scoreMapSignals(profile.keywords, keywordTokens(item.title), 1.1);
  const deckResult = scoreMapSignals(profile.keywords, keywordTokens(item.deck), 0.55);
  const keywordMatches = [...titleResult.matched, ...deckResult.matched];
  const score = categoryResult.score + tagResult.score + titleResult.score + deckResult.score;

  if (score <= 0) {
    return null;
  }

  return {
    item,
    score,
    reason: reasonForRecommendation(tagResult.matched, categoryResult.matched, keywordMatches, []),
    matchedSignals: unique([
      ...categoryResult.matched.map((signal) => signal.label),
      ...tagResult.matched.map((signal) => signal.label),
      ...keywordMatches.map((signal) => signal.label)
    ])
  };
}

export function getFoundationalLearningRecommendations({
  foundations,
  events,
  limit = 3
}: FoundationalLearningInput): FoundationalLearningRecommendation[] {
  const profile = buildInterestProfile(events);

  return foundations
    .map((item) => scoreFoundation(item, profile))
    .filter(
      (recommendation): recommendation is FoundationalLearningRecommendation =>
        Boolean(recommendation)
    )
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit);
}
