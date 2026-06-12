import type { CategoryId } from "@/config/categories";

export type SourceType = "official" | "news" | "paper" | "blog" | "discovery" | "x";

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
};

export type RefreshDebug = {
  totalCandidatesFound: number;
  fallbackCandidateCount?: number;
  candidatesAfterFreshness: number;
  rejectedByAge: number;
  rejectedByLowQuality: number;
  rejectedByDuplicate: number;
  rejectedByTrust: number;
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
  rejected: RejectedCandidate[];
};

export type LastRefresh = {
  refreshedAt: string | null;
  nextRefreshAt: string;
  candidateCount: number;
  categoryCounts: Record<CategoryId, number>;
  status: "success" | "skipped" | "error";
  message?: string;
  debug?: RefreshDebug;
};
