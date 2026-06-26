import { placeholderImageForCategory } from "@/lib/placeholders";
import { createNewsId } from "@/lib/news/ids";
import { canonicalizeUrl, scoreNewsItem } from "@/lib/news/scoring";
import type { CategoryId, RequiredSectionId } from "@/config/categories";
import type { NewsItem } from "@/types/news";

type GithubRepo = {
  id?: number;
  name?: string;
  full_name?: string;
  owner?: { login?: string };
  html_url?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  updated_at?: string;
  pushed_at?: string;
  topics?: string[];
};

type GithubSearchResponse = {
  items?: GithubRepo[];
};

type GithubReadmeResponse = {
  content?: string;
  encoding?: string;
};

type GithubRepositoryFetchOptions = {
  now?: Date;
  categoryIds?: readonly RequiredSectionId[];
  perCategoryLimit?: number;
  maxReadmes?: number;
};

export type GithubTargetedFetchResult = {
  items: NewsItem[];
  failure?: unknown;
};

const REPO_DISCOVERY_QUERIES: Array<{
  category: RequiredSectionId;
  query: string;
}> = [
  {
    category: "developer-tools-open-source",
    query:
      "open source developer tooling cli sdk framework compiler runtime observability language:TypeScript"
  },
  {
    category: "computer-systems",
    query: "operating system kernel database compiler runtime distributed systems storage scheduler"
  },
  {
    category: "cloud-infrastructure",
    query: "kubernetes cloud infrastructure observability reliability platform operator terraform"
  },
  {
    category: "ai-ml",
    query: "machine learning inference training benchmark dataset model evaluation"
  },
  {
    category: "automation-agentic-systems",
    query: "agent workflow automation orchestration tool-use evals"
  },
  {
    category: "embedded-systems",
    query: "robotics embedded firmware microcontroller sensor ros jetson"
  }
];

const EXCLUDED_REPO_SIGNALS = [
  "airdrop",
  "awesome",
  "boilerplate",
  "clone",
  "crypto",
  "demo only",
  "deal",
  "hackathon starter",
  "marketing",
  "meme",
  "nft",
  "prompt pack",
  "saas template",
  "starter",
  "template",
  "token",
  "trading bot",
  "wrapper"
];

const README_TECHNICAL_SIGNALS = [
  "architecture",
  "benchmark",
  "compiler",
  "database",
  "distributed",
  "evaluation",
  "firmware",
  "instrumentation",
  "kernel",
  "latency",
  "observability",
  "performance",
  "production",
  "protocol",
  "runtime",
  "scheduler",
  "sensor",
  "storage",
  "testing",
  "tracing",
  "training"
];

function githubHeaders() {
  const token = process.env.GITHUB_TOKEN?.trim();

  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "TechEveryday/0.1 (+https://example.com)",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function sinceDate(now: Date) {
  return new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function parseDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? fallback : date;
}

function isWithin72Hours(value: string | undefined, now: Date) {
  const date = parseDate(value, now);
  const age = now.getTime() - date.getTime();
  return age >= 0 && age <= 72 * 60 * 60 * 1000;
}

function normalizeText(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasSignal(haystack: string, signal: string) {
  return normalizeText(haystack).includes(normalizeText(signal));
}

function technicalSignalCount(input: string) {
  const haystack = normalizeText(input);
  return README_TECHNICAL_SIGNALS.filter((signal) => hasSignal(haystack, signal)).length;
}

function excludedRepo(repo: GithubRepo) {
  const haystack = [repo.full_name, repo.name, repo.description, ...(repo.topics ?? [])]
    .filter(Boolean)
    .join(" ");

  return EXCLUDED_REPO_SIGNALS.some((signal) => hasSignal(haystack, signal));
}

function categoryForRepo(repo: GithubRepo, readme: string, fallback: CategoryId): CategoryId {
  const haystack = normalizeText(
    [repo.full_name, repo.description, repo.language, readme, ...(repo.topics ?? [])]
      .filter(Boolean)
      .join(" ")
  );

  if (/(robot|robotics|firmware|microcontroller|sensor|embedded|ros|jetson|arm)\b/.test(haystack)) {
    return "embedded-systems";
  }

  if (/(agent|agentic|workflow|orchestration|autonomous|tool use|tool-use)\b/.test(haystack)) {
    return "automation-agentic-systems";
  }

  if (/(cli|sdk|developer|framework|library|debug|tracing|tooling|runtime)\b/.test(haystack)) {
    return "developer-tools-open-source";
  }

  if (/(kubernetes|terraform|cloud|infrastructure|reliability|operator)\b/.test(haystack)) {
    return "cloud-infrastructure";
  }

  if (/(compiler|kernel|database|storage|distributed|scheduler|operating system|memory)\b/.test(haystack)) {
    return "computer-systems";
  }

  if (/(machine learning|inference|training|dataset|model|benchmark|evals?)\b/.test(haystack)) {
    return "ai-ml";
  }

  return fallback;
}

async function fetchJson<T>(url: string, strict: boolean): Promise<T | undefined> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(9000),
    headers: githubHeaders()
  });

  if (!response.ok) {
    if (strict) {
      throw new Error(
        `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`
      );
    }

    return undefined;
  }

  return (await response.json()) as T;
}

async function searchRepos(
  query: string,
  now: Date,
  perCategoryLimit: number,
  strict: boolean
) {
  const url = new URL("https://api.github.com/search/repositories");
  url.searchParams.set(
    "q",
    `${query} pushed:>=${sinceDate(now)} stars:>=200 archived:false fork:false`
  );
  url.searchParams.set("sort", "updated");
  url.searchParams.set("order", "desc");
  url.searchParams.set("per_page", String(perCategoryLimit));

  const payload = await fetchJson<GithubSearchResponse>(url.toString(), strict);
  return payload?.items ?? [];
}

async function fetchReadme(repo: GithubRepo, strict: boolean) {
  const fullName = repo.full_name;
  if (!fullName || !/^[^/]+\/[^/]+$/.test(fullName)) {
    return "";
  }

  const url = `https://api.github.com/repos/${fullName}/readme`;
  const payload = await fetchJson<GithubReadmeResponse>(url, strict);

  if (!payload?.content || payload.encoding !== "base64") {
    return "";
  }

  try {
    return Buffer.from(payload.content.replace(/\s/g, ""), "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function readmeHasLearningValue(readme: string) {
  return readme.trim().length >= 120 && technicalSignalCount(readme) >= 3;
}

function describeReadme(readme: string) {
  const clean = readme
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_\-[\]()`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentence = clean.match(/[^.!?]+[.!?]/)?.[0]?.trim() ?? clean;

  return sentence.length > 220 ? `${sentence.slice(0, 217).trim()}...` : sentence;
}

function repoWhyItMatters(repo: GithubRepo, readme: string) {
  const readmeSummary = describeReadme(readme);
  const description = repo.description?.trim();
  const topic = readmeSummary || description || repo.full_name || "this repository";

  return `Study this repository to learn from a recently active codebase: ${topic}`;
}

function repoSummary(repo: GithubRepo, readme: string) {
  const description = repo.description?.trim() || "No repository description provided";
  const language = repo.language?.trim() || "Unknown";
  const stars = repo.stargazers_count ?? 0;
  const forks = repo.forks_count ?? 0;
  const updatedAt = repo.pushed_at || repo.updated_at || "";
  const date = updatedAt ? new Date(updatedAt).toISOString().slice(0, 10) : "unknown";
  const readmeSummary = describeReadme(readme);

  return [
    `Repository: ${repo.full_name}.`,
    `Description: ${description}.`,
    `Language: ${language}.`,
    `Stars: ${stars}.`,
    `Forks: ${forks}.`,
    `Last updated: ${date}.`,
    readmeSummary ? `README: ${readmeSummary}` : ""
  ]
    .filter(Boolean)
    .join(" ");
}

function repoTags(repo: GithubRepo, category: CategoryId) {
  const language = repo.language?.trim().toLowerCase();

  return Array.from(
    new Set(
      [
        "github",
        "repository",
        category,
        language,
        ...(repo.topics ?? []).map((topic) => topic.toLowerCase())
      ].filter((tag): tag is string => Boolean(tag))
    )
  ).slice(0, 8);
}

function repoEligible(repo: GithubRepo, now: Date) {
  if (!repo.full_name || !repo.html_url || !repo.description?.trim()) {
    return false;
  }

  if (!isWithin72Hours(repo.pushed_at || repo.updated_at, now)) {
    return false;
  }

  if ((repo.stargazers_count ?? 0) < 200 && (repo.forks_count ?? 0) < 40) {
    return false;
  }

  return !excludedRepo(repo);
}

async function discoverGithubRepositories({
  now = new Date(),
  categoryIds,
  perCategoryLimit = 6,
  maxReadmes = 18
}: GithubRepositoryFetchOptions) {
  const strict = categoryIds !== undefined;
  const discovered = new Map<string, { repo: GithubRepo; category: CategoryId }>();
  const requestedCategories = categoryIds ? new Set(categoryIds) : undefined;
  const discoveries = requestedCategories
    ? REPO_DISCOVERY_QUERIES.filter((discovery) =>
        requestedCategories.has(discovery.category)
      )
    : REPO_DISCOVERY_QUERIES;

  for (const discovery of discoveries) {
    const repos = await searchRepos(discovery.query, now, perCategoryLimit, strict);

    for (const repo of repos) {
      if (repo.full_name && !discovered.has(repo.full_name) && repoEligible(repo, now)) {
        discovered.set(repo.full_name, { repo, category: discovery.category });
      }
    }
  }

  const items: NewsItem[] = [];
  let readmeRequests = 0;

  for (const { repo, category: fallbackCategory } of discovered.values()) {
    if (readmeRequests >= maxReadmes) {
      break;
    }

    readmeRequests += 1;
    const readme = await fetchReadme(repo, strict);

    if (!readmeHasLearningValue(readme)) {
      continue;
    }

    const category = categoryForRepo(repo, readme, fallbackCategory);
    const title = repo.full_name ?? repo.name ?? "GitHub repository";
    const url = repo.html_url ?? "";
    const summary = repoSummary(repo, readme);

    items.push(
      scoreNewsItem(
        {
          id: createNewsId(url, title),
          title,
          summary,
          url,
          canonicalUrl: canonicalizeUrl(url),
          sourceName: "GitHub",
          sourceType: "repo",
          category,
          publishedAt: parseDate(repo.pushed_at || repo.updated_at, now).toISOString(),
          foundAt: now.toISOString(),
          imageUrl: placeholderImageForCategory(category, title),
          trustScore: Math.min(0.94, 0.78 + Math.log10((repo.stargazers_count ?? 0) + 1) / 20),
          freshnessScore: 0,
          technicalDepthScore: 0,
          educationalScore: 0,
          practicalUsefulnessScore: 0,
          noveltyScore: 0,
          finalScore: 0,
          saved: false,
          tags: repoTags(repo, category),
          keyClaims: [],
          whyItMatters: repoWhyItMatters(repo, readme)
        } satisfies NewsItem,
        now
      )
    );
  }

  return items.sort(
    (left, right) =>
      right.finalScore - left.finalScore ||
      right.trustScore - left.trustScore ||
      new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime()
  );
}

export function fetchGithubRepositories(
  options: GithubRepositoryFetchOptions & {
    categoryIds: readonly RequiredSectionId[];
  }
): Promise<GithubTargetedFetchResult>;
export function fetchGithubRepositories(
  options?: GithubRepositoryFetchOptions & {
    categoryIds?: undefined;
  }
): Promise<NewsItem[]>;
export async function fetchGithubRepositories(
  options: GithubRepositoryFetchOptions = {}
): Promise<NewsItem[] | GithubTargetedFetchResult> {
  try {
    const items = await discoverGithubRepositories(options);
    return options.categoryIds ? { items } : items;
  } catch (error) {
    if (options.categoryIds) {
      return {
        items: [],
        failure: error
      };
    }

    return [];
  }
}
