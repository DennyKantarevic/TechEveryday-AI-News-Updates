import { describe, expect, it } from "vitest";
import { createCategoryRecord } from "@/config/categories";
import {
  classifyCategory,
  dedupeCandidates,
  scoreContentQuality,
  selectDailyItems,
  selectDailyItemsWithDebug
} from "@/lib/news/classify";
import type { NewsItem } from "@/types/news";

const baseItem = (overrides: Partial<NewsItem>): NewsItem => ({
  id: overrides.id ?? "item-1",
  title: overrides.title ?? "AI agents learn to automate developer workflows",
  summary:
    overrides.summary ??
    "A technical engineering summary with model architecture, workflow implementation details, benchmark evidence, and developer lessons.",
  url: overrides.url ?? `https://example.com/${overrides.id ?? "item-1"}`,
  canonicalUrl: overrides.canonicalUrl ?? overrides.url ?? `https://example.com/${overrides.id ?? "item-1"}`,
  sourceName: overrides.sourceName ?? "Example Source",
  sourceType: overrides.sourceType ?? "news",
  category: overrides.category ?? "ai-ml",
  publishedAt: overrides.publishedAt ?? "2026-06-11T08:00:00.000Z",
  foundAt: overrides.foundAt ?? "2026-06-11T09:00:00.000Z",
  imageUrl: overrides.imageUrl ?? "data:image/svg+xml,placeholder",
  trustScore: overrides.trustScore ?? 0.9,
  freshnessScore: overrides.freshnessScore ?? 4,
  technicalDepthScore: overrides.technicalDepthScore ?? 3,
  educationalScore: overrides.educationalScore ?? 3,
  practicalUsefulnessScore: overrides.practicalUsefulnessScore ?? 3,
  noveltyScore: overrides.noveltyScore ?? 0,
  finalScore: overrides.finalScore ?? 3.7,
  saved: overrides.saved ?? false,
  tags: overrides.tags ?? ["ai"],
  keyClaims: overrides.keyClaims ?? ["A technical system changed."],
  whyItMatters: overrides.whyItMatters ?? "It helps readers understand a current technical change.",
  excludedReason: overrides.excludedReason
});

const emptyPreviousCategories = () => createCategoryRecord(() => [] as NewsItem[]);

describe("classifyCategory", () => {
  it("maps paper items to Research Papers first", () => {
    expect(
      classifyCategory({
        title: "A new transformer benchmark",
        summary: "Research paper on large language models.",
        sourceType: "paper",
        sourceName: "arXiv"
      })
    ).toBe("research-papers");
  });

  it("classifies infrastructure language into Cloud / Infrastructure", () => {
    expect(
      classifyCategory({
        title: "Cloudflare announces new workers observability tools",
        summary: "Infrastructure logs and edge compute updates.",
        sourceType: "blog",
        sourceName: "Cloudflare Blog"
      })
    ).toBe("cloud-infrastructure");
  });
});

describe("dedupeCandidates", () => {
  it("deduplicates exact URLs and very similar titles", () => {
    const items = [
      baseItem({ id: "a", url: "https://example.com/a", title: "OpenAI launches a new model for developers" }),
      baseItem({ id: "b", url: "https://example.com/a", title: "Different syndication title" }),
      baseItem({ id: "c", url: "https://example.com/c", title: "OpenAI launches new model for developers" })
    ];

    expect(dedupeCandidates(items).map((item) => item.id)).toEqual(["a"]);
  });
});

describe("selectDailyItems", () => {
  it("preserves previous category content only when it is still inside 72 hours", () => {
    const previous = emptyPreviousCategories();
    previous["cloud-infrastructure"] = [
      baseItem({
        id: "old-cloud",
        category: "cloud-infrastructure",
        title: "Previous cloud observability architecture story",
        summary:
          "An engineering explainer about cloud observability architecture, reliability, tracing, and production operations.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["cloud", "observability", "architecture"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [baseItem({ id: "new-ai", category: "ai-ml" })],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["cloud-infrastructure"].map((item) => item.id)).toEqual(["old-cloud"]);
    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["new-ai"]);
  });

  it("does not preserve previous category content older than 72 hours", () => {
    const previous = emptyPreviousCategories();
    previous["cloud-infrastructure"] = [
      baseItem({
        id: "stale-cloud",
        category: "cloud-infrastructure",
        title: "Stale cloud story",
        publishedAt: "2026-06-08T12:59:00.000Z",
        foundAt: "2026-06-08T13:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["cloud-infrastructure"]).toEqual([]);
  });

  it("does not preserve starter placeholders even when their timestamps are fresh", () => {
    const previous = emptyPreviousCategories();
    previous["embedded-systems"] = [
      baseItem({
        id: "starter-embedded-systems-ieee-spectrum",
        category: "embedded-systems",
        title: "IEEE Spectrum trusted Embedded Systems source",
        summary: "Starter content identifies a trusted source but is not a fetched article.",
        publishedAt: "2026-06-12T09:00:00.000Z",
        foundAt: "2026-06-12T09:00:00.000Z",
        tags: ["starter", "embedded-systems"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [],
      previousCategories: previous,
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["embedded-systems"]).toEqual([]);
  });

  it("keeps current candidates within 72 hours even when they are not from the same calendar day", () => {
    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "two-day-old-paper",
          category: "research-papers",
          sourceType: "paper",
          sourceName: "arXiv",
          title: "Distributed systems paper explains consensus benchmark",
          summary:
            "A research paper with benchmark, dataset, method, and implementation details for distributed systems.",
          publishedAt: "2026-06-09T14:00:00.000Z",
          foundAt: "2026-06-11T13:00:00.000Z",
          tags: ["arxiv", "benchmark", "distributed systems"]
        })
      ],
      previousCategories: emptyPreviousCategories(),
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["research-papers"].map((item) => item.id)).toEqual(["two-day-old-paper"]);
  });

  it("rejects candidates older than 72 hours instead of showing stale filler", () => {
    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "old-ai",
          category: "ai-ml",
          title: "Old AI model architecture analysis",
          summary:
            "A technical explainer about model architecture, benchmarks, training, and inference.",
          publishedAt: "2026-06-09T12:59:00.000Z",
          foundAt: "2026-06-12T13:00:00.000Z",
          tags: ["ai", "model", "benchmark", "architecture"]
        })
      ],
      previousCategories: emptyPreviousCategories(),
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["ai-ml"]).toEqual([]);
  });

  it("filters broad trusted-source items that have no technical relevance signal", () => {
    const previous = emptyPreviousCategories();
    previous["computer-systems"] = [
      baseItem({
        id: "old-systems",
        category: "computer-systems",
        title: "Previous distributed systems runtime story",
        summary:
          "A technical analysis of distributed runtime architecture, storage reliability, and operational tradeoffs.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["distributed", "runtime", "storage"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "policy-story",
          category: "computer-systems",
          title: "Senators debate media policy",
          summary: "A broad political update without a computing systems angle.",
          sourceName: "Ars Technica",
          trustScore: 0.82,
          tags: []
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["computer-systems"].map((item) => item.id)).toEqual(["old-systems"]);
  });

  it("does not top up a previous story when the same fresh story moved to another category", () => {
    const previous = emptyPreviousCategories();
    previous["research-papers"] = [
      baseItem({
        id: "previous-weaver",
        category: "research-papers",
        sourceType: "paper",
        sourceName: "arXiv",
        title: "WEAVER, Better, Faster, Longer",
        url: "https://arxiv.org/abs/2606.12345",
        canonicalUrl: "https://arxiv.org/abs/2606.12345",
        summary:
          "A robotics paper with world model architecture, manipulation benchmarks, and implementation details.",
        publishedAt: "2026-06-12T08:00:00.000Z",
        foundAt: "2026-06-12T09:00:00.000Z",
        tags: ["arxiv", "cs.RO"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "new-weaver",
          category: "embedded-systems",
          sourceType: "paper",
          sourceName: "arXiv",
          title: "WEAVER, Better, Faster, Longer",
          url: "https://arxiv.org/abs/2606.12345",
          canonicalUrl: "https://arxiv.org/abs/2606.12345",
          summary:
            "A robotics paper with world model architecture, manipulation benchmarks, and implementation details.",
          tags: ["arxiv", "cs.RO", "robotics"]
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["embedded-systems"].map((item) => item.id)).toEqual(["new-weaver"]);
    expect(selected["research-papers"]).toEqual([]);
  });

  it("does not preserve previous items whose source no longer covers that category", () => {
    const previous = emptyPreviousCategories();
    previous["cloud-infrastructure"] = [
      baseItem({
        id: "previous-amiga",
        category: "cloud-infrastructure",
        sourceName: "Hackaday",
        sourceType: "blog",
        title: "Amiga 1232 Storm CD Packs Every Upgrade into One Wedge",
        summary: "A short retrocomputing note without cloud infrastructure depth.",
        url: "https://hackaday.com/2026/06/11/amiga-1232-storm-cd-packs-every-upgrade-into-one-wedge/",
        canonicalUrl:
          "https://hackaday.com/2026/06/11/amiga-1232-storm-cd-packs-every-upgrade-into-one-wedge",
        tags: ["cloud-infrastructure", "Retrocomputing", "Amiga"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [],
      previousCategories: previous,
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected["cloud-infrastructure"]).toEqual([]);
  });

  it("filters entertainment, drama, and fake-podcast style low-signal stories", () => {
    const previous = emptyPreviousCategories();
    previous["developer-tools-open-source"] = [
      baseItem({
        id: "old-devtools",
        category: "developer-tools-open-source",
        title: "Previous developer tools framework release",
        summary:
          "A practical developer guide covering framework APIs, CLI workflows, migration details, and open source maintenance.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["developer", "framework", "cli", "open source"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "fake-podcast",
          category: "developer-tools-open-source",
          title: "Drug sites hijacked Spotify's search ranking through fake podcasts",
          summary:
            "A viral entertainment story about fake podcasts and online drama with little practical technical detail.",
          sourceName: "Wired",
          trustScore: 0.82,
          tags: ["viral", "fake podcast", "drama"]
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["developer-tools-open-source"].map((item) => item.id)).toEqual([
      "old-devtools"
    ]);
  });

  it("does not let low-value AI culture drama through just because it has tech keywords", () => {
    const previous = emptyPreviousCategories();
    previous["ai-ml"] = [
      baseItem({
        id: "old-ai",
        category: "ai-ml",
        title: "Previous AI engineering story",
        foundAt: "2026-06-10T12:00:00.000Z"
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "viral-ai-drama",
          category: "ai-ml",
          title: "Viral AI app drama sparks creator outrage",
          summary:
            "A celebrity creator rumor and meme cycle around a viral AI app with no technical implementation detail.",
          sourceName: "The Verge",
          trustScore: 0.78,
          tags: ["ai", "viral", "drama", "rumor"]
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["old-ai"]);
  });

  it("does not treat short technical terms as substrings inside unrelated words", () => {
    const previous = emptyPreviousCategories();
    previous["ai-ml"] = [
      baseItem({
        id: "old-ai",
        category: "ai-ml",
        title: "Previous AI model benchmark story",
        summary:
          "A technical model benchmark explainer covering training, inference, architecture, and evaluation details.",
        foundAt: "2026-06-10T12:00:00.000Z",
        tags: ["ai", "model", "benchmark", "training"]
      })
    ];

    const selected = selectDailyItems({
      candidates: [
        baseItem({
          id: "available-story",
          category: "ai-ml",
          title: "Available policy update arrives today",
          summary: "A general update that only contains the letters a and i as part of longer words.",
          sourceName: "Example Source",
          trustScore: 0.82,
          tags: []
        })
      ],
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    expect(selected["ai-ml"].map((item) => item.id)).toEqual(["old-ai"]);
  });

  it("limits single-source dominance when enough same-category alternatives exist", () => {
    const previous = emptyPreviousCategories();
    const candidates = [
      baseItem({
        id: "openai-1",
        title: "OpenAI releases a new AI model for developers",
        url: "https://openai.com/news/1",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "openai-2",
        title: "OpenAI expands model inference infrastructure",
        url: "https://openai.com/news/2",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "openai-3",
        title: "OpenAI publishes machine learning platform update",
        url: "https://openai.com/news/3",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "openai-4",
        title: "OpenAI improves multimodal model training",
        url: "https://openai.com/news/4",
        sourceName: "OpenAI Blog",
        trustScore: 0.94
      }),
      baseItem({
        id: "google-1",
        title: "Google Research shares a new machine learning benchmark",
        url: "https://research.google/blog/benchmark",
        sourceName: "Google Research Blog",
        trustScore: 0.93
      }),
      baseItem({
        id: "anthropic-1",
        title: "Anthropic details AI agent evaluation research",
        url: "https://anthropic.com/news/agent-evals",
        sourceName: "Anthropic News",
        trustScore: 0.92
      })
    ];

    const selected = selectDailyItems({
      candidates,
      previousCategories: previous,
      now: new Date("2026-06-11T13:00:00.000Z")
    });

    const aiSources = selected["ai-ml"].map((item) => item.sourceName);
    const openAiCount = aiSources.filter((source) => source === "OpenAI Blog").length;

    expect(selected["ai-ml"]).toHaveLength(5);
    expect(openAiCount).toBeLessThanOrEqual(3);
    expect(new Set(aiSources).size).toBeGreaterThanOrEqual(3);
  });

  it("reports source-type and educational-quality rejection diagnostics", () => {
    const selected = selectDailyItemsWithDebug({
      candidates: [
        baseItem({
          id: "consumer-gadget",
          title: "The best phone camera rumors before launch day",
          summary:
            "A consumer gadget rumor roundup about phone pricing, camera bump leaks, and launch speculation without architecture, benchmarks, or implementation detail.",
          category: "embedded-systems",
          sourceName: "The Verge",
          sourceType: "news",
          tags: ["gadget", "rumor", "phone prices"]
        }),
        baseItem({
          id: "low-depth-ai",
          title: "AI will change everything for every business",
          summary:
            "A broad opinion column says artificial intelligence will be important, but it gives no model architecture, benchmark result, implementation detail, or developer workflow.",
          category: "ai-ml",
          sourceName: "Example News",
          sourceType: "news",
          tags: ["ai", "opinion"]
        }),
        baseItem({
          id: "arxiv-robotics",
          title: "Robotic manipulation benchmark improves long-horizon planning",
          summary:
            "An arXiv paper introduces a robotics benchmark, reports manipulation success-rate results, and explains the policy architecture and evaluation method.",
          sourceName: "arXiv",
          sourceType: "paper",
          category: "embedded-systems",
          tags: ["arxiv", "cs.RO", "benchmark", "robotics"]
        }),
        baseItem({
          id: "repo-runtime",
          title: "systems-lab/runtime-tracer",
          summary:
            "Repository: runtime-tracer. Description: an open source Rust tracing runtime with scheduler instrumentation, p99 latency examples, and a meaningful README. Language: Rust. Stars: 2840. Last updated: 2026-06-12.",
          sourceName: "GitHub",
          sourceType: "repo" as never,
          category: "developer-tools-open-source",
          tags: ["github", "repository", "rust", "runtime", "tracing"]
        })
      ],
      previousCategories: emptyPreviousCategories(),
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected.categories["embedded-systems"].map((item) => item.id)).toEqual([
      "arxiv-robotics"
    ]);
    expect(selected.categories["developer-tools-open-source"].map((item) => item.id)).toEqual([
      "repo-runtime"
    ]);
    expect(selected.debug.rejectedAsConsumerFiller).toBe(1);
    expect(selected.debug.rejectedByLowTechnicalDepth).toBe(1);
    expect(selected.debug.sourceTypeCounts).toEqual({
      article: 2,
      paper: 1,
      repo: 1
    });
  });

  it("rejects commercial candidates before selection and reports the reason code", () => {
    const selected = selectDailyItemsWithDebug({
      candidates: [
        baseItem({
          id: "prime-day-deal",
          title: "Best Prime Day laptop deals under $500",
          url: "https://consumer.example/deals/prime-day-laptops",
          summary: "Save 40% on our favorite laptops during Amazon Prime Day.",
          sourceName: "Consumer Tech"
        }),
        baseItem({
          id: "scheduler-notes",
          title: "Kubernetes SIG releases technical notes on scheduler changes",
          url: "https://kubernetes.io/blog/2026/06/12/scheduler-notes/",
          sourceName: "Kubernetes"
        })
      ],
      previousCategories: emptyPreviousCategories(),
      now: new Date("2026-06-12T13:00:00.000Z")
    });

    expect(selected.categories["ai-ml"].map((item) => item.id)).toEqual(["scheduler-notes"]);
    expect(selected.debug.rejectedBySalesPromotion).toBe(1);
    expect(selected.debug.rejected).toContainEqual(
      expect.objectContaining({
        id: "prime-day-deal",
        reasonCode: "shopping_or_deal"
      })
    );
  });
});

describe("scoreContentQuality", () => {
  it("rejects consumer, culture, funding-only, vague hype, listicle, and sponsored filler", () => {
    const cases = [
      baseItem({
        title: "The best smart ring deals to buy this weekend",
        summary: "A sponsored affiliate shopping listicle about consumer gadget discounts.",
        category: "embedded-systems",
        sourceName: "Example Deals",
        sourceType: "news",
        tags: ["sponsored", "deal", "listicle", "shopping"]
      }),
      baseItem({
        title: "How a viral AI chatbot became the internet's favorite drama",
        summary:
          "A culture story about memes, entertainment, celebrity reactions, and social media discourse without implementation detail.",
        category: "ai-ml",
        sourceName: "Wired",
        sourceType: "news",
        tags: ["culture", "viral", "drama", "celebrity"]
      }),
      baseItem({
        title: "Startup raises $80M to reinvent enterprise AI",
        summary:
          "A funding announcement describes investors, valuation, and founder quotes but no model architecture, benchmarks, dataset, or engineering constraints.",
        category: "ai-ml",
        sourceName: "Example News",
        sourceType: "news",
        tags: ["funding round", "startup", "founder"]
      }),
      baseItem({
        title: "AI will change everything about software forever",
        summary:
          "A vague opinion piece argues artificial intelligence is progressing quickly without explaining a method, implementation, benchmark, or reproducible system.",
        category: "ai-ml",
        sourceName: "Example News",
        sourceType: "news",
        tags: ["ai", "opinion"]
      })
    ];

    for (const item of cases) {
      expect(scoreContentQuality(item).excludedReason).toMatch(
        /consumer|filler|low-information|low-value|technical depth/i
      );
    }
  });

  it("accepts educational papers, official engineering posts, systems writeups, repos, and embedded builds", () => {
    const cases = [
      baseItem({
        title: "arXiv paper introduces a new distributed training benchmark",
        summary:
          "The paper defines a benchmark, reports scaling results, compares methods, and describes the training system architecture.",
        sourceName: "arXiv",
        sourceType: "paper",
        category: "research-papers",
        tags: ["arxiv", "benchmark", "distributed", "training"]
      }),
      baseItem({
        title: "Cloudflare explains Durable Objects storage architecture",
        summary:
          "The official engineering post explains storage layout, replication, reliability tradeoffs, observability, and production migration details.",
        sourceName: "Cloudflare Blog",
        sourceType: "official",
        category: "cloud-infrastructure",
        tags: ["storage", "architecture", "reliability", "production"]
      }),
      baseItem({
        title: "Linux scheduler patch reduces p99 latency under memory pressure",
        summary:
          "The systems writeup covers kernel scheduling, memory behavior, benchmark results, and implementation tradeoffs.",
        sourceName: "LWN.net",
        sourceType: "news",
        category: "computer-systems",
        tags: ["kernel", "scheduler", "memory", "benchmark"]
      }),
      baseItem({
        title: "robotics-lab/visual-servo-controller",
        summary:
          "Repository: visual-servo-controller. Description: open source robotics controller with firmware, sensor calibration, ROS integration, benchmarks, and a meaningful README. Language: C++. Stars: 1820. Last updated: 2026-06-12.",
        sourceName: "GitHub",
        sourceType: "repo" as never,
        category: "embedded-systems",
        tags: ["github", "repository", "robotics", "firmware", "ros"]
      }),
      baseItem({
        title: "Building a deterministic sensor-fusion module for a microcontroller rover",
        summary:
          "The build writeup details firmware timing, sensor calibration, power constraints, memory layout, and reproducible benchmark measurements.",
        sourceName: "Hackster",
        sourceType: "blog",
        category: "embedded-systems",
        tags: ["firmware", "sensor", "microcontroller", "benchmark"]
      })
    ];

    for (const item of cases) {
      expect(scoreContentQuality(item).excludedReason).toBeUndefined();
    }
  });

  it("explains why low-information novelty stories are excluded", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "Celebrity prank app goes viral after fake podcast drama",
        summary: "A light entertainment-only story about a viral meme and creator outrage.",
        category: "developer-tools-open-source",
        tags: ["celebrity", "prank", "viral", "drama"]
      })
    );

    expect(score.educationalScore).toBeLessThan(2);
    expect(score.technicalDepthScore).toBeLessThan(2);
    expect(score.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("rejects tech-adjacent influencer and sports items without engineering depth", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "The US is requiring foreign influencers to get work visas for the World Cup",
        summary:
          "The story focuses on platform creator programs, visas, and sports event logistics without explaining technical systems, infrastructure, or engineering tradeoffs.",
        category: "cloud-infrastructure",
        sourceName: "Wired",
        sourceType: "news",
        tags: ["influencer", "world cup", "platforms"]
      })
    );

    expect(score.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("rejects podcast and lawsuit stories that lack reusable technical detail", () => {
    const podcast = scoreContentQuality(
      baseItem({
        title: "Hackaday Podcast Ep 373: GPS, Danger In Space, and Robby the Robot",
        summary:
          "A podcast episode roundup with several interesting topics but no focused architecture, benchmark, implementation, or reproducible engineering detail.",
        category: "embedded-systems",
        sourceName: "Hackaday",
        sourceType: "blog",
        tags: ["podcast", "episode"]
      })
    );
    const lawsuit = scoreContentQuality(
      baseItem({
        title: "Lawsuit: ChatGPT validated suicidal woman's distrust of crisis lines",
        summary:
          "A legal story focused on personal harm and litigation rather than technical model architecture, benchmark evidence, or implementation guidance.",
        category: "embedded-systems",
        sourceName: "Ars Technica",
        sourceType: "news",
        tags: ["lawsuit"]
      })
    );

    expect(podcast.excludedReason).toMatch(/low-information|low-value/i);
    expect(lawsuit.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("rejects celebrity wealth coverage that lacks technical substance", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "Elon Musk is the world's first trillionaire",
        summary:
          "A wealth and net worth story about an IPO, shares, and personal finances rather than model architecture, infrastructure, benchmarks, or engineering implementation.",
        category: "ai-ml",
        sourceName: "The Verge",
        sourceType: "news",
        tags: ["ai"]
      })
    );

    expect(score.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("rejects shallow product pricing and hobby novelty posts without reusable technical detail", () => {
    const phonePrice = scoreContentQuality(
      baseItem({
        title: "Nothing CEO says phone prices are going to keep going up",
        summary:
          "A CEO comments that RAM costs increased and phone prices may rise, without architecture, benchmarks, implementation details, or developer-reusable technical analysis.",
        category: "ai-ml",
        sourceName: "The Verge",
        sourceType: "news",
        tags: ["ai"]
      })
    );
    const hobbyCar = scoreContentQuality(
      baseItem({
        title: "Building a 1:150 scale Toyota ProBox Micro Remote Control Car",
        summary:
          "A hobby scale model car comes to life, but the excerpt does not explain firmware, sensor timing, power constraints, or embedded implementation details.",
        category: "embedded-systems",
        sourceName: "Hackaday",
        sourceType: "blog",
        tags: ["toy hacks", "scale model"]
      })
    );

    expect(phonePrice.excludedReason).toMatch(/low-information|low-value/i);
    expect(hobbyCar.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("rejects bare security update bulletins without explanatory engineering context", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "Security updates for Friday",
        summary: "15, linux-azure-fips, lwip, mistral, and ubuntu-kylin-software-center).",
        category: "cloud-infrastructure",
        sourceName: "LWN.net",
        sourceType: "news",
        tags: ["cloud-infrastructure"]
      })
    );

    expect(score.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("rejects startup valuation and gaming-data stories when they lack technical substance", () => {
    const startup = scoreContentQuality(
      baseItem({
        title: "Jeff Bezos' AI startup aims to build an artificial general engineer",
        summary:
          "A founder describes a startup, funding round, and valuation according to reports, but the excerpt does not provide model architecture, benchmark results, or implementation details.",
        category: "ai-ml",
        sourceName: "The Verge",
        sourceType: "news",
        tags: ["ai"]
      })
    );
    const gamingData = scoreContentQuality(
      baseItem({
        title: "Pokémon Go players unwittingly contributed to tech with military drone uses",
        summary: "The repurposing of Pokémon Go data for AI training continues to draw scrutiny.",
        category: "computer-systems",
        sourceName: "Ars Technica",
        sourceType: "news",
        tags: ["gaming", "ai drones"]
      })
    );

    expect(startup.excludedReason).toMatch(/low-information|low-value/i);
    expect(gamingData.excludedReason).toMatch(/low-information|low-value/i);
  });

  it("keeps practical technical explainers and engineering writeups", () => {
    const score = scoreContentQuality(
      baseItem({
        title: "Cloudflare explains new Workers observability architecture",
        summary:
          "The engineering writeup details tracing, metrics, runtime architecture, reliability tradeoffs, and implementation guidance for production teams.",
        category: "cloud-infrastructure",
        sourceName: "Cloudflare Blog",
        sourceType: "official",
        tags: ["observability", "runtime", "architecture", "engineering"]
      })
    );

    expect(score.educationalScore).toBeGreaterThanOrEqual(2);
    expect(score.technicalDepthScore).toBeGreaterThanOrEqual(2);
    expect(score.practicalUsefulnessScore).toBeGreaterThanOrEqual(1);
    expect(score.excludedReason).toBeUndefined();
  });
});
