import type { CategoryId } from "@/config/categories";

export type SourceType =
  | "official"
  | "news"
  | "paper"
  | "blog"
  | "discovery"
  | "repo"
  | "x";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  canonicalUrl: string;
  sourceName: string;
  sourceType: SourceType;
  category: CategoryId;
  publishedAt: string;
  foundAt: string;
  imageUrl?: string;
  trustScore: number;
  freshnessScore: number;
  technicalDepthScore: number;
  educationalScore: number;
  practicalUsefulnessScore: number;
  noveltyScore: number;
  finalScore: number;
  saved: boolean;
  tags: string[];
  keyClaims: string[];
  whyItMatters: string;
  excludedReason?: string;
};

export type DailyNews = {
  refreshedAt: string;
  timezone: "America/New_York";
  categories: Record<CategoryId, NewsItem[]>;
};

export type RejectedCandidate = {
  id?: string;
  title: string;
  url: string;
  sourceName: string;
  reason: string;
  reasonCode?:
    | "sales_or_promotion"
    | "shopping_or_deal"
    | "consumer_buying_guide";
};

export type RefreshDebug = {
  totalCandidatesFound: number;
  fallbackCandidateCount?: number;
  sourceDiagnostics?: Record<
    string,
    {
      requestUrl?: string;
      rawCount: number;
      afterFreshnessCount: number;
      afterQualityCount: number;
      selectedCount: number;
    }
  >;
  candidatesAfterFreshness: number;
  rejectedByAge: number;
  rejectedBySalesPromotion: number;
  rejectedAsConsumerFiller: number;
  rejectedByLowTechnicalDepth: number;
  rejectedByLowQuality: number;
  rejectedByDuplicate: number;
  rejectedByTrust: number;
  sourceTypeCounts: {
    article: number;
    paper: number;
    repo: number;
  };
  finalSelectedByCategory: Record<CategoryId, number>;
  underfilledCategories?: Partial<
    Record<
      CategoryId,
      {
        attemptedFallback: boolean;
        selectedCount: number;
        targetCount: number;
        message: string;
      }
    >
  >;
  sourcesUsed: string[];
  failedSources?: RefreshSourceFailure[];
  rejected: RejectedCandidate[];
};

export type RefreshSourceFailure = {
  sourceName: string;
  reason: string;
  at: string;
};

export type LastRefresh = {
  refreshedAt: string | null;
  nextRefreshAt: string;
  lastRefreshStartedAt?: string | null;
  lastRefreshCompletedAt?: string | null;
  lastRefreshDateAmericaNewYork?: string | null;
  itemsFound?: number;
  itemsSelected?: number;
  errors?: string[];
  failedSources?: RefreshSourceFailure[];
  trigger?: "scheduled" | "manual" | "api";
  candidateCount: number;
  categoryCounts: Record<CategoryId, number>;
  status: "success" | "skipped" | "error" | "running";
  message?: string;
  debug?: RefreshDebug;
};
