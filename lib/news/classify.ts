import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { TRUSTED_SOURCES } from "@/config/sources";
import { classifyCommercialContent } from "@/lib/news/commercialContent";
import { evaluateFreshness, isFreshNewsItem } from "@/lib/news/freshness";
import { MAX_ITEMS_PER_SECTION } from "@/lib/news/sectionQuotas";
import type { CategoryId } from "@/config/categories";
import type { NewsItem, RefreshDebug, SourceType } from "@/types/news";

type ClassificationInput = {
  title: string;
  summary?: string;
  sourceName?: string;
  sourceType: SourceType;
  hints?: CategoryId[];
  tags?: string[];
};

const KEYWORDS: Record<CategoryId, string[]> = {
  "ai-ml": [
    "ai",
    "artificial intelligence",
    "machine learning",
    "model",
    "llm",
    "neural",
    "training",
    "inference",
    "multimodal",
    "deep learning"
  ],
  "automation-agentic-systems": [
    "agent",
    "agentic",
    "automation",
    "workflow",
    "orchestration",
    "autonomous",
    "copilot",
    "tool use",
    "robotic process"
  ],
  "research-papers": [
    "paper",
    "arxiv",
    "research",
    "benchmark",
    "dataset",
    "study",
    "conference",
    "proceedings"
  ],
  "embedded-systems": [
    "embedded",
    "chip",
    "sensor",
    "firmware",
    "microcontroller",
    "edge device",
    "robot",
    "semiconductor",
    "hardware"
  ],
  "computer-systems": [
    "operating system",
    "kernel",
    "compiler",
    "storage",
    "database",
    "architecture",
    "distributed system",
    "memory",
    "runtime"
  ],
  "developer-tools-open-source": [
    "developer",
    "open source",
    "github",
    "framework",
    "sdk",
    "api",
    "typescript",
    "javascript",
    "tooling",
    "cli"
  ],
  "cloud-infrastructure": [
    "cloud",
    "infrastructure",
    "kubernetes",
    "serverless",
    "edge",
    "observability",
    "network",
    "aws",
    "azure",
    "reliability",
    "platform"
  ]
};

const GLOBAL_TECH_SIGNALS = Array.from(
  new Set([
    ...Object.values(KEYWORDS).flat(),
    "benchmark results",
    "case study",
    "codebase",
    "open source repository",
    "readme",
    "repository",
    "reproducible",
    "openai",
    "anthropic",
    "deepmind",
    "nvidia",
    "cloudflare",
    "github",
    "microsoft research",
    "google research",
    "meta ai",
    "apple machine learning",
    "aws",
    "arxiv",
    "ieee",
    "acm"
  ])
);

const LOW_VALUE_CONTENT_SIGNALS = [
  "affiliate",
  "business drama",
  "celebrity",
  "clash",
  "consumer gadget",
  "culture",
  "daily dose",
  "deal",
  "prank",
  "viral",
  "fake podcast",
  "drama",
  "funding",
  "rumor",
  "rumors",
  "outrage",
  "meme",
  "entertainment-only",
  "entertainment",
  "gossip",
  "gadget",
  "gadget hype",
  "government clash",
  "creator outrage",
  "creator program",
  "episode",
  "celebrity wealth",
  "ceo says",
  "ceo comments",
  "funding round",
  "founder",
  "gaming",
  "influencer",
  "launch speculation",
  "leak",
  "leaks",
  "listicle",
  "newsletter",
  "hobby",
  "lawsuit",
  "litigation",
  "light-interest",
  "motorsport",
  "net worth",
  "personal finances",
  "phone prices",
  "phone camera",
  "prices may rise",
  "product pricing",
  "product rumor",
  "podcast",
  "pokemon go",
  "pokémon go",
  "press release",
  "pledge to practice",
  "remote control car",
  "scale model",
  "shopping",
  "smart ring",
  "social media discourse",
  "startup",
  "accessibility goals",
  "inclusive open source ecosystem",
  "security updates for",
  "sports event",
  "suicidal",
  "toy hacks",
  "trillionaire",
  "work visa",
  "world cup"
];

const EDUCATIONAL_SIGNALS = [
  "analysis",
  "architecture",
  "benchmark",
  "benchmark results",
  "case study",
  "codebase",
  "concept",
  "deep dive",
  "detail",
  "educational",
  "engineering",
  "evaluation",
  "explain",
  "explainer",
  "guide",
  "implementation",
  "implementation detail",
  "paper",
  "readme",
  "reproducible",
  "research",
  "technical",
  "tutorial",
  "whitepaper",
  "why"
];

const TECHNICAL_DEPTH_SIGNALS = [
  "algorithm",
  "api",
  "architecture",
  "benchmark",
  "benchmark setup",
  "compiler",
  "constraint",
  "database",
  "dataset",
  "distributed",
  "firmware",
  "inference",
  "infrastructure",
  "instrumentation",
  "kernel",
  "kubernetes",
  "latency",
  "memory",
  "model",
  "observability",
  "performance",
  "protocol",
  "reliability",
  "runtime",
  "sdk",
  "scheduler",
  "source code",
  "storage",
  "system",
  "training",
  "workflow"
];

const PRACTICAL_USEFULNESS_SIGNALS = [
  "api",
  "best practice",
  "cli",
  "codebase",
  "developer",
  "framework",
  "guide",
  "how to",
  "implementation",
  "migration",
  "open source",
  "operations",
  "platform",
  "production",
  "readme",
  "release",
  "repository",
  "reproducible",
  "tool",
  "upgrade"
];

export type ContentQualityScore = {
  educationalScore: number;
  technicalDepthScore: number;
  noveltyScore: number;
  practicalUsefulnessScore: number;
  excludedReason?: string;
};

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsSignal(haystack: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword);

  if (!normalizedKeyword) {
    return false;
  }

  if (/^[a-z0-9]+$/.test(normalizedKeyword) && normalizedKeyword.length <= 3) {
    return new RegExp(`(?:^|[\\s-])${escapeRegExp(normalizedKeyword)}(?:$|[\\s-])`).test(
      haystack
    );
  }

  return haystack.includes(normalizedKeyword);
}

function signalScore(haystack: string, signals: string[], weight = 1) {
  return signals.reduce(
    (score, signal) => score + (containsSignal(haystack, signal) ? weight : 0),
    0
  );
}

function clampScore(value: number, max = 5) {
  return Math.min(max, value);
}

function titleTokens(title: string) {
  return new Set(
    normalizeText(title)
      .split(" ")
      .filter((token) => token.length > 2 && !["the", "and", "for", "with", "from"].includes(token))
  );
}

function titleSimilarity(left: string, right: string) {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);

  if (!leftTokens.size || !rightTokens.size) {
    return 0;
  }

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / Math.min(leftTokens.size, rightTokens.size);
}

function normalizeUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_|ref$|ref_src$)/i.test(key)) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.searchParams.sort();
    return parsed.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return url.trim().toLowerCase();
  }
}

export function classifyCategory(input: ClassificationInput): CategoryId {
  if (input.sourceType === "paper") {
    return "research-papers";
  }

  const haystack = normalizeText(
    [input.title, input.summary, input.sourceName, ...(input.tags ?? [])].filter(Boolean).join(" ")
  );
  const scores = createCategoryRecord((categoryId) => {
    const keywordScore = KEYWORDS[categoryId].reduce(
      (score, keyword) => score + (containsSignal(haystack, keyword) ? 2 : 0),
      0
    );
    const hintScore = input.hints?.includes(categoryId) ? 1 : 0;
    return keywordScore + hintScore;
  });

  return CATEGORY_IDS.reduce((best, categoryId) =>
    scores[categoryId] > scores[best] ? categoryId : best
  );
}

function sourcePriority(item: NewsItem) {
  if (item.sourceType === "paper" || item.sourceType === "repo" || item.sourceType === "official") {
    return 5;
  }
  if (item.sourceType === "blog") {
    return 4;
  }
  if (item.sourceType === "news") {
    return 3;
  }
  if (item.sourceType === "x") {
    return 2;
  }
  return 1;
}

export function dedupeCandidatesWithDebug(items: NewsItem[]) {
  const accepted: NewsItem[] = [];
  const urls = new Set<string>();
  const sorted = [...items].sort(
    (left, right) =>
      sourcePriority(right) - sourcePriority(left) ||
      right.trustScore - left.trustScore ||
      right.finalScore - left.finalScore ||
      itemTime(right) - itemTime(left)
  );
  const rejected: RefreshDebug["rejected"] = [];

  for (const item of sorted) {
    const urlKey = normalizeUrl(item.canonicalUrl || item.url);

    if (urls.has(urlKey)) {
      rejected.push({
        id: item.id,
        title: item.title,
        url: item.url,
        sourceName: item.sourceName,
        category: item.category,
        reason: "Rejected as a duplicate canonical URL."
      });
      continue;
    }

    const similarTitle = accepted.find(
      (existing) =>
        normalizeUrl(existing.canonicalUrl || existing.url) === urlKey ||
        titleSimilarity(existing.title, item.title) >= 0.82
    );

    if (similarTitle) {
      rejected.push({
        id: item.id,
        title: item.title,
        url: item.url,
        sourceName: item.sourceName,
        category: item.category,
        reason: `Rejected as a duplicate story cluster of "${similarTitle.title}".`
      });
      continue;
    }

    urls.add(urlKey);
    accepted.push(item);
  }

  return { accepted, rejected };
}

export function dedupeCandidates(items: NewsItem[]) {
  return dedupeCandidatesWithDebug(items).accepted;
}

function itemTime(item: NewsItem) {
  return new Date(item.publishedAt || item.foundAt).getTime();
}

function scoreItemForSelection(item: NewsItem, now: Date): NewsItem {
  const freshness = evaluateFreshness({ publishedAt: item.publishedAt, now });
  const quality = scoreContentQuality(item);
  const sourceTrustScore = Math.max(0, Math.min(5, item.trustScore * 5));
  const categoryFitScore = Math.min(5, quality.technicalDepthScore + quality.educationalScore);
  const finalScore =
    freshness.freshnessScore * 0.14 +
    sourceTrustScore * 0.12 +
    quality.technicalDepthScore * 0.26 +
    quality.educationalScore * 0.22 +
    quality.practicalUsefulnessScore * 0.16 +
    categoryFitScore * 0.1 -
    quality.noveltyScore * 0.3;

  return {
    ...item,
    canonicalUrl: item.canonicalUrl || normalizeUrl(item.url),
    freshnessScore: freshness.freshnessScore,
    technicalDepthScore: quality.technicalDepthScore,
    educationalScore: quality.educationalScore,
    practicalUsefulnessScore: quality.practicalUsefulnessScore,
    noveltyScore: quality.noveltyScore,
    finalScore: Number(finalScore.toFixed(3)),
    keyClaims: item.keyClaims?.length ? item.keyClaims : [item.title],
    whyItMatters:
      item.whyItMatters?.trim() ||
      "It helps readers understand a current technical change from a trusted source."
  };
}

export function scoreContentQuality(item: NewsItem): ContentQualityScore {
  const commercial = classifyCommercialContent(item);
  const haystack = normalizeText(
    [item.title, item.summary, item.sourceName, item.tags.join(" ")].join(" ")
  );
  const lowValueSignals = signalScore(haystack, LOW_VALUE_CONTENT_SIGNALS, 1);
  const categoryDepthSignals = KEYWORDS[item.category].filter((keyword) =>
    containsSignal(haystack, keyword)
  ).length;
  const summaryTokenCount = normalizeText(item.summary).split(" ").filter(Boolean).length;
  const trustedTechnicalSource =
    item.sourceType === "official" ||
    item.sourceType === "blog" ||
    item.sourceType === "paper" ||
    item.sourceType === "repo";
  const primaryLearningSource = item.sourceType === "paper" || item.sourceType === "repo";
  const educationalScore = clampScore(
    signalScore(haystack, EDUCATIONAL_SIGNALS, 1) +
      (item.sourceType === "paper" ? 2 : 0) +
      (item.sourceType === "repo" ? 2 : 0) +
      (summaryTokenCount >= 18 ? 1 : 0)
  );
  const technicalDepthScore = clampScore(
    signalScore(haystack, TECHNICAL_DEPTH_SIGNALS, 1) +
      Math.min(2, categoryDepthSignals) +
      (trustedTechnicalSource ? 1 : 0) +
      (primaryLearningSource ? 1 : 0)
  );
  const practicalUsefulnessScore = clampScore(
    signalScore(haystack, PRACTICAL_USEFULNESS_SIGNALS, 1) +
      (trustedTechnicalSource ? 1 : 0) +
      (item.sourceType === "repo" ? 2 : 0)
  );
  const noveltyScore = clampScore(lowValueSignals * 2 + (commercial.rejected ? 4 : 0));
  const negatesTechnicalDepth =
    /without (?:explaining|technical|engineering|infrastructure|systems|architecture|benchmarks?|implementation|developer)|does not (?:explain|provide)|lacks (?:technical|engineering|educational)|no (?:model architecture|benchmark result|implementation detail|developer workflow|focused (?:architecture|benchmark|implementation|engineering|technical))|rather than (?:model architecture|technical|engineering|infrastructure|benchmarks?|implementation)|legal story focused/.test(
      haystack
    );
  const hasHighSignalSubstance =
    educationalScore >= 2 && technicalDepthScore >= 3 && practicalUsefulnessScore >= 1;
  const hasStrongTechnicalDepth =
    technicalDepthScore >= 3 &&
    (educationalScore >= 2 || practicalUsefulnessScore >= 2) &&
    !negatesTechnicalDepth;
  const isConsumerOutlet =
    /^(?:wired|the verge|cnet|engadget|techradar|pcmag|tom['’]s guide)$/i.test(
      item.sourceName.trim()
    );
  const isConsumerFiller =
    lowValueSignals >= 1 ||
    /best .*(?:gadgets?|phones?|laptops?|deals)|(?:gadget|phone|camera|launch) (?:rumou?r|leak|deal)|startup raises|social media|culture story|founder quotes/i.test(
      `${item.title} ${item.summary}`
    );
  const excludedReason =
    commercial.rejected
      ? commercial.reason
      : isConsumerOutlet && !hasStrongTechnicalDepth
        ? "Excluded as low-value consumer-media filler without rare technical explainer depth."
      : isConsumerFiller && !hasHighSignalSubstance
        ? "Excluded as consumer/filler low-value coverage without enough educational technical value."
        : noveltyScore >= 2 && (negatesTechnicalDepth || !hasHighSignalSubstance)
          ? "Excluded as consumer/filler low-value novelty, drama, or entertainment-only coverage."
          : negatesTechnicalDepth && !primaryLearningSource
            ? "Excluded as low-information coverage with low technical depth and insufficient educational implementation detail."
          : educationalScore < 1 || (technicalDepthScore < 3 && !primaryLearningSource)
            ? "Excluded as low-information coverage with low technical depth and insufficient educational implementation detail."
        : undefined;

  return {
    educationalScore,
    technicalDepthScore,
    noveltyScore,
    practicalUsefulnessScore,
    excludedReason
  };
}

function isTrustedRelevant(item: NewsItem) {
  if (item.trustScore < 0.65 || !item.title.trim() || !item.url.trim()) {
    return false;
  }

  if (classifyCommercialContent(item).rejected) {
    return false;
  }

  const configuredSource = TRUSTED_SOURCES.find((source) => source.name === item.sourceName);
  const configuredCategories = configuredSource?.allowedCategories ?? configuredSource?.categoryHints;

  if (configuredCategories && !configuredCategories.includes(item.category)) {
    return false;
  }

  const quality = scoreContentQuality(item);
  const externalTags = item.tags.filter(
    (tag) => !CATEGORY_IDS.includes(tag as CategoryId) && tag !== item.category
  );
  const haystack = normalizeText(
    [item.title, item.summary, item.sourceName, externalTags.join(" ")].join(" ")
  );
  const categorySignal = KEYWORDS[item.category].some((keyword) =>
    containsSignal(haystack, keyword)
  );
  const globalSignal = GLOBAL_TECH_SIGNALS.some((keyword) => containsSignal(haystack, keyword));
  return (categorySignal || globalSignal) && !quality.excludedReason;
}

function rejectionReason(item: NewsItem, now: Date) {
  if (item.trustScore < 0.65 || !item.title.trim() || !item.url.trim()) {
    return {
      reason: "Rejected because the source trust score or required fields were insufficient."
    };
  }

  const commercial = classifyCommercialContent(item);
  if (commercial.rejected) {
    return {
      reason: commercial.reason,
      reasonCode: commercial.reasonCode
    };
  }

  const freshness = evaluateFreshness({ publishedAt: item.publishedAt, now });
  if (!freshness.accepted) {
    return {
      reason: freshness.excludedReason ?? "Rejected by the 72-hour freshness gate."
    };
  }

  const quality = scoreContentQuality(item);
  if (quality.excludedReason) {
    return { reason: quality.excludedReason };
  }

  const externalTags = item.tags.filter(
    (tag) => !CATEGORY_IDS.includes(tag as CategoryId) && tag !== item.category
  );
  const haystack = normalizeText(
    [item.title, item.summary, item.sourceName, externalTags.join(" ")].join(" ")
  );
  const categorySignal = KEYWORDS[item.category].some((keyword) =>
    containsSignal(haystack, keyword)
  );
  const globalSignal = GLOBAL_TECH_SIGNALS.some((keyword) => containsSignal(haystack, keyword));

  if (!categorySignal && !globalSignal) {
    return { reason: "Rejected because it lacked a clear technical category fit." };
  }

  return undefined;
}

function uniqueById(items: NewsItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function sourceTypeBucket(item: Pick<NewsItem, "sourceType">) {
  if (item.sourceType === "paper") {
    return "paper";
  }

  if (item.sourceType === "repo") {
    return "repo";
  }

  return "article";
}

function sourceTypeCounts(items: NewsItem[]): RefreshDebug["sourceTypeCounts"] {
  return items.reduce(
    (counts, item) => {
      counts[sourceTypeBucket(item)] += 1;
      return counts;
    },
    { article: 0, paper: 0, repo: 0 }
  );
}

function isAgeRejection(reason: string) {
  return /older than 72|trustworthy date|future/i.test(reason);
}

function isDuplicateRejection(reason: string) {
  return /duplicate/i.test(reason);
}

function isSalesPromotionRejection(reasonCode?: string) {
  return ["sales_or_promotion", "shopping_or_deal", "consumer_buying_guide"].includes(
    reasonCode ?? ""
  );
}

function isConsumerFillerRejection(reason: string) {
  return /consumer|filler|shopping|deal|sponsored|listicle|promo|culture|entertainment|drama|funding|rumou?r/i.test(
    reason
  );
}

function isLowTechnicalDepthRejection(reason: string) {
  return /low technical depth|low-information|category fit|implementation detail/i.test(
    reason
  );
}

function isLowQualityRejection(reason: string) {
  return /low-information|low-value|low technical depth|consumer|filler|category fit|promotional|shopping|deal|buying-guide|sales/i.test(
    reason
  );
}

function isTrustRejection(reason: string) {
  return /trust score|required fields/i.test(reason);
}

function selectDiverseCategoryItems(items: NewsItem[], limit: number) {
  const uniqueSourceCount = new Set(items.map((item) => item.sourceName)).size;

  if (uniqueSourceCount <= 1) {
    return items.slice(0, limit);
  }

  const selected: NewsItem[] = [];
  const selectedIds = new Set<string>();
  const sourceCounts = new Map<string, number>();
  const addItem = (item: NewsItem) => {
    selected.push(item);
    selectedIds.add(item.id);
    sourceCounts.set(item.sourceName, (sourceCounts.get(item.sourceName) ?? 0) + 1);
  };
  const hasItem = (item: NewsItem) => selectedIds.has(item.id);

  for (const item of items) {
    if (!sourceCounts.has(item.sourceName)) {
      addItem(item);
    }

    if (selected.length >= Math.min(limit, uniqueSourceCount)) {
      break;
    }
  }

  for (const item of items) {
    if (!hasItem(item) && (sourceCounts.get(item.sourceName) ?? 0) < 3) {
      addItem(item);
    }

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const item of items) {
    if (!hasItem(item)) {
      addItem(item);
    }

    if (selected.length >= limit) {
      break;
    }
  }

  return selected;
}

export function selectDailyItems({
  candidates,
  previousCategories,
  now
}: {
  candidates: NewsItem[];
  previousCategories: Record<CategoryId, NewsItem[]>;
  now: Date;
}) {
  return selectDailyItemsWithDebug({ candidates, previousCategories, now }).categories;
}

export function selectDailyItemsWithDebug({
  candidates,
  previousCategories,
  now
}: {
  candidates: NewsItem[];
  previousCategories: Record<CategoryId, NewsItem[]>;
  now: Date;
}) {
  const rejected: RefreshDebug["rejected"] = [];
  const candidatesAfterQuality = candidates.filter((item) => {
    const rejection = rejectionReason(item, now);

    if (!rejection) {
      return true;
    }

    rejected.push({
      id: item.id,
      title: item.title,
      url: item.url,
      sourceName: item.sourceName,
      category: item.category,
      ...rejection
    });
    return false;
  });
  const scoredCandidates = candidatesAfterQuality.map((item) => scoreItemForSelection(item, now));
  const deduped = dedupeCandidatesWithDebug(scoredCandidates);
  rejected.push(...deduped.rejected);

  const freshCandidates = deduped.accepted.sort((left, right) => {
    const qualityDelta = right.finalScore - left.finalScore;
    if (Math.abs(qualityDelta) >= 0.25) {
      return qualityDelta;
    }

    const trustDelta = right.trustScore - left.trustScore;
    return Math.abs(trustDelta) > 0.04 ? trustDelta : itemTime(right) - itemTime(left);
  });

  const selectedNewItemsByCategory = createCategoryRecord((categoryId) =>
    selectDiverseCategoryItems(
      freshCandidates.filter((item) => item.category === categoryId),
      MAX_ITEMS_PER_SECTION
    )
  );
  const allSelectedNewItems = Object.values(selectedNewItemsByCategory).flat();
  const matchesAnyNewStory = (previous: NewsItem) =>
    allSelectedNewItems.some(
      (item) =>
        item.id === previous.id ||
        titleSimilarity(item.title, previous.title) >= 0.82 ||
        (normalizeUrl(item.canonicalUrl || item.url) ===
          normalizeUrl(previous.canonicalUrl || previous.url) &&
          titleSimilarity(item.title, previous.title) >= 0.5)
    );

  const categories = createCategoryRecord((categoryId) => {
    const newItems = selectedNewItemsByCategory[categoryId];
    const previousItems = (previousCategories[categoryId] ?? [])
      .filter((previous) => !previous.id.startsWith("starter-") && !previous.tags.includes("starter"))
      .filter((previous) => isFreshNewsItem(previous, now))
      .filter(isTrustedRelevant)
      .map((previous) => scoreItemForSelection({ ...previous, saved: false }, now));
    const freshTopUp = previousItems.filter(
      (previous) => !matchesAnyNewStory(previous)
    );

    return uniqueById([...newItems, ...freshTopUp])
      .sort(
        (left, right) =>
          right.finalScore - left.finalScore ||
          right.trustScore - left.trustScore ||
          itemTime(right) - itemTime(left)
      )
      .slice(0, MAX_ITEMS_PER_SECTION);
  });

  const rejectedByAge = rejected.filter((item) => isAgeRejection(item.reason)).length;
  const rejectedByDuplicate = rejected.filter((item) => isDuplicateRejection(item.reason)).length;
  const rejectedBySalesPromotion = rejected.filter((item) =>
    isSalesPromotionRejection(item.reasonCode)
  ).length;
  const rejectedAsConsumerFiller = rejected.filter((item) =>
    isConsumerFillerRejection(item.reason)
  ).length;
  const rejectedByLowTechnicalDepth = rejected.filter((item) =>
    isLowTechnicalDepthRejection(item.reason)
  ).length;
  const rejectedByLowQuality = rejected.filter((item) =>
    isLowQualityRejection(item.reason)
  ).length;
  const rejectedByTrust = rejected.filter((item) => isTrustRejection(item.reason)).length;
  const finalItems = Object.values(categories).flat();
  const sectionSelectionDiagnostics = createCategoryRecord((categoryId) => {
    const categoryRejected = rejected.filter((item) => item.category === categoryId);

    return {
      totalCandidates: candidates.filter((item) => item.category === categoryId).length,
      candidatesAfterFreshness:
        candidates.filter((item) => item.category === categoryId).length -
        categoryRejected.filter((item) => isAgeRejection(item.reason)).length,
      candidatesAfterQuality: candidatesAfterQuality.filter(
        (item) => item.category === categoryId
      ).length,
      candidatesAfterDeduplication: deduped.accepted.filter(
        (item) => item.category === categoryId
      ).length,
      selectedCount: categories[categoryId]?.length ?? 0,
      rejectedByAge: categoryRejected.filter((item) => isAgeRejection(item.reason)).length,
      rejectedByQuality: categoryRejected.filter((item) =>
        isLowQualityRejection(item.reason)
      ).length,
      rejectedBySalesPromotion: categoryRejected.filter((item) =>
        isSalesPromotionRejection(item.reasonCode)
      ).length,
      rejectedAsConsumerFiller: categoryRejected.filter((item) =>
        isConsumerFillerRejection(item.reason)
      ).length,
      rejectedByDuplicate: categoryRejected.filter((item) =>
        isDuplicateRejection(item.reason)
      ).length,
      rejectedByTrust: categoryRejected.filter((item) => isTrustRejection(item.reason)).length
    };
  });
  const debug: RefreshDebug = {
    totalCandidatesFound: candidates.length,
    candidatesAfterFreshness: candidates.length - rejectedByAge,
    rejectedByAge,
    rejectedBySalesPromotion,
    rejectedAsConsumerFiller,
    rejectedByLowTechnicalDepth,
    rejectedByLowQuality,
    rejectedByDuplicate,
    rejectedByTrust,
    sourceTypeCounts: sourceTypeCounts(candidates),
    sectionSelectionDiagnostics,
    finalSelectedByCategory: createCategoryRecord(
      (categoryId) => categories[categoryId]?.length ?? 0
    ),
    sourcesUsed: Array.from(new Set(finalItems.map((item) => item.sourceName))).sort(),
    rejected
  };

  return { categories, debug };
}
