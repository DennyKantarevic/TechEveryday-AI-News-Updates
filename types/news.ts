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
  category?: CategoryId;
  reason: string;
  reasonCode?:
    | "sales_or_promotion"
    | "shopping_or_deal"
    | "consumer_buying_guide";
};

export type UnderfilledSectionReason =
  | "not enough fresh candidates"
  | "rejected by quality filter"
  | "rejected as sales/promotion/filler"
  | "deduplicated"
  | "section cap/final cap issue"
  | "source/category shortage";

export type SectionSelectionDiagnostics = {
  totalCandidates: number;
  candidatesAfterFreshness: number;
  candidatesAfterQuality: number;
  candidatesAfterDeduplication: number;
  selectedCount: number;
  rejectedByAge: number;
  rejectedByQuality: number;
  rejectedBySalesPromotion: number;
  rejectedAsConsumerFiller: number;
  rejectedByDuplicate: number;
  rejectedByTrust: number;
};

export type RefreshDebug = {
  totalCandidatesFound: number;
  fallbackCandidateCount?: number;
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
  sectionSelectionDiagnostics?: Record<CategoryId, SectionSelectionDiagnostics>;
  finalSelectedByCategory: Record<CategoryId, number>;
  underfilledCategories?: Partial<
    Record<
      CategoryId,
      {
        attemptedFallback: boolean;
        selectedCount: number;
        targetCount: number;
        reasons: UnderfilledSectionReason[];
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
