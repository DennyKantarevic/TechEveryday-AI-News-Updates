import { CATEGORY_IDS, createCategoryRecord } from "@/config/categories";
import { isSameZonedDay } from "@/lib/time";
import type { CategoryId } from "@/config/categories";
import type { NewsItem, SourceType } from "@/types/news";

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
  cybersecurity: [
    "security",
    "cyber",
    "vulnerability",
    "cve",
    "threat",
    "malware",
    "phishing",
    "ransomware",
    "zero trust",
    "identity"
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

const LOW_VALUE_PROMO_SIGNALS = [
  "summer sale",
  "sale brings",
  "save big",
  "membership saving",
  "gift guide",
  "shopping",
  "gaming sale"
];

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
    parsed.search = "";
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

export function dedupeCandidates(items: NewsItem[]) {
  const accepted: NewsItem[] = [];
  const urls = new Set<string>();

  for (const item of items) {
    const urlKey = normalizeUrl(item.url);

    if (urls.has(urlKey)) {
      continue;
    }

    const similarTitle = accepted.some(
      (existing) => titleSimilarity(existing.title, item.title) >= 0.82
    );

    if (similarTitle) {
      continue;
    }

    urls.add(urlKey);
    accepted.push(item);
  }

  return accepted;
}

function itemTime(item: NewsItem) {
  return new Date(item.publishedAt || item.foundAt).getTime();
}

function isTrustedRelevant(item: NewsItem) {
  if (item.trustScore < 0.65 || !item.title.trim() || !item.url.trim()) {
    return false;
  }

  const title = normalizeText(item.title);
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
  const lowValuePromo = LOW_VALUE_PROMO_SIGNALS.some((keyword) => title.includes(keyword));

  return (categorySignal || globalSignal) && !lowValuePromo;
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
  const freshCandidates = dedupeCandidates(candidates)
    .filter(isTrustedRelevant)
    .filter((item) => {
      const foundAt = new Date(item.foundAt);
      const publishedAt = new Date(item.publishedAt);
      return isSameZonedDay(foundAt, now) || isSameZonedDay(publishedAt, now);
    })
    .sort((left, right) => {
      const trustDelta = right.trustScore - left.trustScore;
      return Math.abs(trustDelta) > 0.04 ? trustDelta : itemTime(right) - itemTime(left);
    });

  return createCategoryRecord((categoryId) => {
    const newItems = selectDiverseCategoryItems(
      freshCandidates.filter((item) => item.category === categoryId),
      5
    );
    const previousItems = previousCategories[categoryId] ?? [];

    if (newItems.length === 0) {
      return previousItems.slice(0, 5);
    }

    const topUp = previousItems.filter(
      (previous) =>
        !newItems.some(
          (item) =>
            item.id === previous.id ||
            normalizeUrl(item.url) === normalizeUrl(previous.url) ||
            titleSimilarity(item.title, previous.title) >= 0.82
        )
    );

    return uniqueById([...newItems, ...topUp]).slice(0, 5);
  });
}
