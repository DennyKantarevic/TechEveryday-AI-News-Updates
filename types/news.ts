import type { CategoryId } from "@/config/categories";

export type SourceType = "news" | "paper" | "x" | "blog" | "official";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  sourceName: string;
  sourceType: SourceType;
  category: CategoryId;
  publishedAt: string;
  foundAt: string;
  imageUrl: string;
  trustScore: number;
  saved: boolean;
  tags: string[];
};

export type DailyNews = {
  refreshedAt: string;
  timezone: "America/New_York";
  categories: Record<CategoryId, NewsItem[]>;
};

export type LastRefresh = {
  refreshedAt: string | null;
  nextRefreshAt: string;
  candidateCount: number;
  categoryCounts: Record<CategoryId, number>;
  status: "success" | "skipped" | "error";
  message?: string;
};
