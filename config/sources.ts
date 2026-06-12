import type { CategoryId } from "@/config/categories";
import type { SourceType } from "@/types/news";

export type TrustedSourceConfig = {
  name: string;
  homepageUrl: string;
  rssUrl: string;
  sourceType: Extract<SourceType, "news" | "blog" | "official">;
  trustScore: number;
  categoryHints: CategoryId[];
};

export const TRUSTED_SOURCES: TrustedSourceConfig[] = [
  {
    name: "The Verge",
    homepageUrl: "https://www.theverge.com",
    rssUrl: "https://www.theverge.com/rss/index.xml",
    sourceType: "news",
    trustScore: 0.78,
    categoryHints: ["ai-ml", "developer-tools-open-source", "cloud-infrastructure"]
  },
  {
    name: "Ars Technica",
    homepageUrl: "https://arstechnica.com",
    rssUrl: "https://feeds.arstechnica.com/arstechnica/index",
    sourceType: "news",
    trustScore: 0.82,
    categoryHints: ["computer-systems", "cybersecurity", "cloud-infrastructure"]
  },
  {
    name: "Wired",
    homepageUrl: "https://www.wired.com",
    rssUrl: "https://www.wired.com/feed/rss",
    sourceType: "news",
    trustScore: 0.75,
    categoryHints: ["ai-ml", "cybersecurity", "automation-agentic-systems"]
  },
  {
    name: "MIT Technology Review",
    homepageUrl: "https://www.technologyreview.com",
    rssUrl: "https://www.technologyreview.com/feed/",
    sourceType: "news",
    trustScore: 0.86,
    categoryHints: ["ai-ml", "research-papers", "embedded-systems"]
  },
  {
    name: "IEEE Spectrum",
    homepageUrl: "https://spectrum.ieee.org",
    rssUrl: "https://spectrum.ieee.org/rss/fulltext",
    sourceType: "news",
    trustScore: 0.86,
    categoryHints: ["embedded-systems", "computer-systems", "ai-ml"]
  },
  {
    name: "Communications of the ACM",
    homepageUrl: "https://cacm.acm.org",
    rssUrl: "https://cacm.acm.org/feed/",
    sourceType: "news",
    trustScore: 0.86,
    categoryHints: ["computer-systems", "research-papers", "developer-tools-open-source"]
  },
  {
    name: "Google Research Blog",
    homepageUrl: "https://research.google/blog/",
    rssUrl: "https://research.google/blog/rss/",
    sourceType: "official",
    trustScore: 0.94,
    categoryHints: ["ai-ml", "research-papers", "automation-agentic-systems"]
  },
  {
    name: "OpenAI Blog",
    homepageUrl: "https://openai.com/news/",
    rssUrl: "https://openai.com/news/rss.xml",
    sourceType: "official",
    trustScore: 0.94,
    categoryHints: ["ai-ml", "automation-agentic-systems", "developer-tools-open-source"]
  },
  {
    name: "Anthropic News",
    homepageUrl: "https://www.anthropic.com/news",
    rssUrl: "https://www.anthropic.com/news/rss.xml",
    sourceType: "official",
    trustScore: 0.93,
    categoryHints: ["ai-ml", "automation-agentic-systems"]
  },
  {
    name: "Microsoft Research Blog",
    homepageUrl: "https://www.microsoft.com/en-us/research/blog/",
    rssUrl: "https://www.microsoft.com/en-us/research/feed/",
    sourceType: "official",
    trustScore: 0.91,
    categoryHints: ["research-papers", "ai-ml", "computer-systems"]
  },
  {
    name: "Meta AI Blog",
    homepageUrl: "https://ai.meta.com/blog/",
    rssUrl: "https://ai.meta.com/blog/rss/",
    sourceType: "official",
    trustScore: 0.91,
    categoryHints: ["ai-ml", "research-papers"]
  },
  {
    name: "NVIDIA Blog",
    homepageUrl: "https://blogs.nvidia.com",
    rssUrl: "https://blogs.nvidia.com/feed/",
    sourceType: "official",
    trustScore: 0.89,
    categoryHints: ["ai-ml", "embedded-systems", "cloud-infrastructure"]
  },
  {
    name: "Apple Machine Learning Research",
    homepageUrl: "https://machinelearning.apple.com",
    rssUrl: "https://machinelearning.apple.com/rss.xml",
    sourceType: "official",
    trustScore: 0.9,
    categoryHints: ["ai-ml", "research-papers", "embedded-systems"]
  },
  {
    name: "AWS Blog",
    homepageUrl: "https://aws.amazon.com/blogs/aws/",
    rssUrl: "https://aws.amazon.com/blogs/aws/feed/",
    sourceType: "official",
    trustScore: 0.88,
    categoryHints: ["cloud-infrastructure", "developer-tools-open-source", "cybersecurity"]
  },
  {
    name: "Cloudflare Blog",
    homepageUrl: "https://blog.cloudflare.com",
    rssUrl: "https://blog.cloudflare.com/rss/",
    sourceType: "official",
    trustScore: 0.9,
    categoryHints: ["cloud-infrastructure", "cybersecurity", "computer-systems"]
  },
  {
    name: "GitHub Blog",
    homepageUrl: "https://github.blog",
    rssUrl: "https://github.blog/feed/",
    sourceType: "official",
    trustScore: 0.88,
    categoryHints: ["developer-tools-open-source", "automation-agentic-systems", "cybersecurity"]
  }
];
