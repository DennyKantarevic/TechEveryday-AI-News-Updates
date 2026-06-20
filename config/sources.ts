import type { CategoryId } from "@/config/categories";
import type { SourceType } from "@/types/news";

export type TrustedSourceConfig = {
  name: string;
  homepageUrl: string;
  rssUrl?: string;
  apiEndpoint?: string;
  sourceType: Extract<SourceType, "news" | "blog" | "official" | "paper" | "discovery">;
  trustScore: number;
  categoryHints: CategoryId[];
  allowedCategories?: CategoryId[];
  isPrimary?: boolean;
  isOfficial?: boolean;
  preferArticleImages?: boolean;
  discoveryOnly?: boolean;
};

function withSourceMetadata(sources: TrustedSourceConfig[]) {
  return sources.map((source) => ({
    ...source,
    allowedCategories: source.allowedCategories ?? source.categoryHints,
    isOfficial: source.isOfficial ?? (source.sourceType === "official"),
    isPrimary:
      source.isPrimary ??
      (source.sourceType === "official" ||
        source.sourceType === "paper" ||
        source.sourceType === "blog")
  }));
}

const EDITORIAL_NEWS_SOURCES: TrustedSourceConfig[] = [
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
    categoryHints: ["computer-systems", "cloud-infrastructure", "embedded-systems"]
  },
  {
    name: "Wired",
    homepageUrl: "https://www.wired.com",
    rssUrl: "https://www.wired.com/feed/rss",
    sourceType: "news",
    trustScore: 0.75,
    categoryHints: ["ai-ml", "automation-agentic-systems"]
  },
  {
    name: "MIT Technology Review",
    homepageUrl: "https://www.technologyreview.com",
    rssUrl: "https://www.technologyreview.com/feed/",
    sourceType: "news",
    trustScore: 0.86,
    categoryHints: ["ai-ml", "research-papers", "automation-agentic-systems", "embedded-systems"]
  },
  {
    name: "IEEE Spectrum",
    homepageUrl: "https://spectrum.ieee.org",
    rssUrl: "https://spectrum.ieee.org/rss/fulltext",
    sourceType: "news",
    trustScore: 0.86,
    categoryHints: ["embedded-systems", "computer-systems", "ai-ml", "cloud-infrastructure"]
  },
  {
    name: "Communications of the ACM",
    homepageUrl: "https://cacm.acm.org",
    sourceType: "news",
    trustScore: 0.86,
    categoryHints: ["computer-systems", "research-papers", "developer-tools-open-source"]
  }
];

const RESEARCH_INDEX_SOURCES: TrustedSourceConfig[] = [
  {
    name: "arXiv",
    homepageUrl: "https://arxiv.org/list/cs/recent",
    sourceType: "paper",
    trustScore: 0.86,
    categoryHints: ["research-papers", "ai-ml", "computer-systems"]
  },
  {
    name: "Papers with Code",
    homepageUrl: "https://paperswithcode.com",
    sourceType: "paper",
    trustScore: 0.82,
    categoryHints: ["research-papers", "ai-ml", "developer-tools-open-source"]
  }
];

const AI_LAB_AND_RESEARCH_SOURCES: TrustedSourceConfig[] = [
  {
    name: "Google Research Blog",
    homepageUrl: "https://research.google/blog/",
    rssUrl: "https://research.google/blog/rss/",
    sourceType: "official",
    trustScore: 0.94,
    categoryHints: ["ai-ml", "research-papers", "automation-agentic-systems"],
    preferArticleImages: true
  },
  {
    name: "Google DeepMind Blog",
    homepageUrl: "https://deepmind.google/blog/",
    rssUrl: "https://deepmind.google/blog/rss.xml",
    sourceType: "official",
    trustScore: 0.94,
    categoryHints: ["ai-ml", "research-papers", "automation-agentic-systems"],
    preferArticleImages: true
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
    sourceType: "official",
    trustScore: 0.93,
    categoryHints: ["ai-ml", "automation-agentic-systems", "research-papers"]
  },
  {
    name: "Hugging Face Blog",
    homepageUrl: "https://huggingface.co/blog",
    rssUrl: "https://huggingface.co/blog/feed.xml",
    sourceType: "blog",
    trustScore: 0.88,
    categoryHints: ["ai-ml", "research-papers", "developer-tools-open-source"]
  },
  {
    name: "Berkeley AI Research Blog",
    homepageUrl: "https://bair.berkeley.edu/blog/",
    rssUrl: "https://bair.berkeley.edu/blog/feed.xml",
    sourceType: "blog",
    trustScore: 0.88,
    categoryHints: ["ai-ml", "research-papers", "automation-agentic-systems"]
  },
  {
    name: "Microsoft Research Blog",
    homepageUrl: "https://www.microsoft.com/en-us/research/blog/",
    rssUrl: "https://www.microsoft.com/en-us/research/feed/",
    sourceType: "official",
    trustScore: 0.91,
    categoryHints: ["research-papers", "ai-ml", "computer-systems"],
    preferArticleImages: true
  },
  {
    name: "Meta AI Blog",
    homepageUrl: "https://ai.meta.com/blog/",
    sourceType: "official",
    trustScore: 0.91,
    categoryHints: ["ai-ml", "research-papers", "developer-tools-open-source"]
  },
  {
    name: "Apple Machine Learning Research",
    homepageUrl: "https://machinelearning.apple.com",
    rssUrl: "https://machinelearning.apple.com/rss.xml",
    sourceType: "official",
    trustScore: 0.9,
    categoryHints: ["ai-ml", "research-papers", "embedded-systems"],
    preferArticleImages: true
  }
];

const PLATFORM_AND_INFRASTRUCTURE_SOURCES: TrustedSourceConfig[] = [
  {
    name: "NVIDIA Technical Blog",
    homepageUrl: "https://developer.nvidia.com/blog/",
    rssUrl: "https://developer.nvidia.com/blog/feed/",
    sourceType: "official",
    trustScore: 0.89,
    categoryHints: ["ai-ml", "embedded-systems", "cloud-infrastructure"]
  },
  {
    name: "AWS Blog",
    homepageUrl: "https://aws.amazon.com/blogs/aws/",
    rssUrl: "https://aws.amazon.com/blogs/aws/feed/",
    sourceType: "official",
    trustScore: 0.88,
    categoryHints: ["cloud-infrastructure", "developer-tools-open-source"]
  },
  {
    name: "AWS Architecture Blog",
    homepageUrl: "https://aws.amazon.com/blogs/architecture/",
    rssUrl: "https://aws.amazon.com/blogs/architecture/feed/",
    sourceType: "official",
    trustScore: 0.88,
    categoryHints: ["cloud-infrastructure", "computer-systems", "developer-tools-open-source"]
  },
  {
    name: "Google Cloud Blog",
    homepageUrl: "https://cloud.google.com/blog",
    sourceType: "official",
    trustScore: 0.87,
    categoryHints: ["cloud-infrastructure", "developer-tools-open-source", "computer-systems"]
  },
  {
    name: "Microsoft Azure Blog",
    homepageUrl: "https://azure.microsoft.com/en-us/blog/",
    rssUrl: "https://azure.microsoft.com/en-us/blog/feed/",
    sourceType: "official",
    trustScore: 0.87,
    categoryHints: ["cloud-infrastructure", "developer-tools-open-source", "computer-systems"]
  },
  {
    name: "Cloudflare Blog",
    homepageUrl: "https://blog.cloudflare.com",
    rssUrl: "https://blog.cloudflare.com/rss/",
    sourceType: "official",
    trustScore: 0.9,
    categoryHints: ["cloud-infrastructure", "computer-systems"]
  },
  {
    name: "GitHub Blog",
    homepageUrl: "https://github.blog",
    rssUrl: "https://github.blog/feed/",
    sourceType: "official",
    trustScore: 0.88,
    categoryHints: ["developer-tools-open-source", "automation-agentic-systems"]
  },
  {
    name: "Vercel Blog",
    homepageUrl: "https://vercel.com/blog",
    rssUrl: "https://vercel.com/blog/rss.xml",
    sourceType: "official",
    trustScore: 0.86,
    categoryHints: ["developer-tools-open-source", "cloud-infrastructure"]
  },
  {
    name: "Docker Blog",
    homepageUrl: "https://www.docker.com/blog/",
    rssUrl: "https://www.docker.com/blog/feed/",
    sourceType: "official",
    trustScore: 0.85,
    categoryHints: ["developer-tools-open-source", "cloud-infrastructure", "computer-systems"]
  },
  {
    name: "Kubernetes Blog",
    homepageUrl: "https://kubernetes.io/blog/",
    rssUrl: "https://kubernetes.io/feed.xml",
    sourceType: "official",
    trustScore: 0.88,
    categoryHints: ["cloud-infrastructure", "computer-systems", "developer-tools-open-source"]
  },
  {
    name: "CNCF Blog",
    homepageUrl: "https://www.cncf.io/blog/",
    rssUrl: "https://www.cncf.io/feed/",
    sourceType: "official",
    trustScore: 0.84,
    categoryHints: ["cloud-infrastructure", "developer-tools-open-source", "computer-systems"]
  },
  {
    name: "ACM Queue",
    homepageUrl: "https://queue.acm.org/",
    rssUrl: "https://queue.acm.org/rss/feeds/queuecontent.xml",
    sourceType: "news",
    trustScore: 0.88,
    categoryHints: ["computer-systems", "cloud-infrastructure", "developer-tools-open-source"]
  },
  {
    name: "Hackaday",
    homepageUrl: "https://hackaday.com",
    rssUrl: "https://hackaday.com/blog/feed/",
    sourceType: "blog",
    trustScore: 0.74,
    categoryHints: ["embedded-systems", "computer-systems", "developer-tools-open-source"]
  },
  {
    name: "Hackster.io",
    homepageUrl: "https://www.hackster.io/news",
    rssUrl: "https://www.hackster.io/news.rss",
    sourceType: "blog",
    trustScore: 0.72,
    categoryHints: ["embedded-systems", "developer-tools-open-source"]
  },
  {
    name: "ARM Community Blog",
    homepageUrl: "https://community.arm.com/arm-community-blogs/",
    sourceType: "official",
    trustScore: 0.84,
    categoryHints: ["embedded-systems", "computer-systems", "developer-tools-open-source"]
  },
  {
    name: "Raspberry Pi News",
    homepageUrl: "https://www.raspberrypi.com/news/",
    rssUrl: "https://www.raspberrypi.com/news/feed/",
    sourceType: "official",
    trustScore: 0.82,
    categoryHints: ["embedded-systems", "developer-tools-open-source", "computer-systems"]
  },
  {
    name: "LWN.net",
    homepageUrl: "https://lwn.net",
    rssUrl: "https://lwn.net/headlines/rss",
    sourceType: "news",
    trustScore: 0.84,
    categoryHints: ["computer-systems", "developer-tools-open-source", "cloud-infrastructure"]
  }
];

const DISCOVERY_SOURCES: TrustedSourceConfig[] = [
  {
    name: "Hacker News",
    homepageUrl: "https://news.ycombinator.com",
    rssUrl: "https://news.ycombinator.com/rss",
    sourceType: "discovery",
    trustScore: 0.67,
    categoryHints: [
      "developer-tools-open-source",
      "computer-systems",
      "ai-ml",
      "cloud-infrastructure"
    ],
    discoveryOnly: true
  }
];

export const TRUSTED_SOURCES: TrustedSourceConfig[] = [
  ...withSourceMetadata(EDITORIAL_NEWS_SOURCES),
  ...withSourceMetadata(RESEARCH_INDEX_SOURCES),
  ...withSourceMetadata(AI_LAB_AND_RESEARCH_SOURCES),
  ...withSourceMetadata(PLATFORM_AND_INFRASTRUCTURE_SOURCES),
  ...withSourceMetadata(DISCOVERY_SOURCES)
];
