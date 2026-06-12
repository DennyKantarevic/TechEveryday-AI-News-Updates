import { isFreshNewsItem } from "@/lib/news/freshness";
import type { CategoryId } from "@/config/categories";
import type { DailyNews, NewsItem } from "@/types/news";

export type LearningFoundation = {
  id: string;
  title: string;
  deck: string;
  points: readonly string[];
  resources: readonly LearningResource[];
  bridge: string;
  categoryIds: readonly CategoryId[];
};

export type LearningResource = {
  title: string;
  author: string;
  year?: number;
  whyItMatters: string;
  url?: string;
  tag: string;
};

export type LearningBridge = {
  foundation: LearningFoundation;
  story?: NewsItem;
};

export const LEARNING_FOUNDATIONS = [
  {
    id: "ai-ml-basics",
    title: "Artificial Intelligence / Machine Learning basics",
    deck: "How models learn patterns, make predictions, and fail in practice.",
    points: [
      "Models learn statistical patterns from examples, not intent.",
      "Training creates behavior; inference applies it to new inputs.",
      "Good evaluation checks accuracy, cost, bias, and failure cases."
    ],
    resources: [
      {
        title: "Computing Machinery and Intelligence",
        author: "Alan Turing",
        year: 1950,
        whyItMatters:
          "Frames the question of machine intelligence and the evaluation mindset that still shapes AI debates.",
        url: "https://doi.org/10.1093/mind/LIX.236.433",
        tag: "AI foundations"
      },
      {
        title: "Attention Is All You Need",
        author: "Vaswani et al.",
        year: 2017,
        whyItMatters:
          "Introduced the Transformer architecture behind most modern language and multimodal systems.",
        url: "https://arxiv.org/abs/1706.03762",
        tag: "Transformers"
      },
      {
        title: "Learning representations by back-propagating errors",
        author: "Rumelhart, Hinton, and Williams",
        year: 1986,
        whyItMatters:
          "Made backpropagation central to training multi-layer neural networks.",
        url: "https://www.nature.com/articles/323533a0",
        tag: "Neural networks"
      }
    ],
    bridge:
      "AI product and policy stories usually turn on what the model can reliably do, where it fails, and who is accountable for the output.",
    categoryIds: ["ai-ml"]
  },
  {
    id: "agents-automation-basics",
    title: "Agents and automation basics",
    deck: "How models become task runners through tools, plans, and guardrails.",
    points: [
      "An agent combines a model with tools, state, and a workflow.",
      "Automation improves when goals, permissions, and checkpoints are explicit.",
      "Reliability depends on bounded actions and observable results."
    ],
    resources: [
      {
        title: "ReAct: Synergizing Reasoning and Acting in Language Models",
        author: "Yao et al.",
        year: 2022,
        whyItMatters:
          "Shows how language models can interleave reasoning traces with tool-like actions.",
        url: "https://arxiv.org/abs/2210.03629",
        tag: "Agents"
      },
      {
        title: "Toolformer: Language Models Can Teach Themselves to Use Tools",
        author: "Schick et al.",
        year: 2023,
        whyItMatters:
          "Explains how model behavior changes when external tools become part of the workflow.",
        url: "https://arxiv.org/abs/2302.04761",
        tag: "Tool use"
      },
      {
        title: "Artificial Intelligence: A Modern Approach",
        author: "Russell and Norvig",
        year: 2021,
        whyItMatters:
          "Gives the classic planning, search, and agent vocabulary behind current automation systems.",
        url: "https://aima.cs.berkeley.edu/",
        tag: "Planning"
      }
    ],
    bridge:
      "Agent stories are easier to judge by asking what tools are connected, what the system is allowed to change, and where humans remain in the loop.",
    categoryIds: ["automation-agentic-systems"]
  },
  {
    id: "embedded-systems-basics",
    title: "Embedded systems basics",
    deck: "Software that runs close to sensors, chips, robots, and devices.",
    points: [
      "Embedded systems balance compute, power, heat, size, and real-time needs.",
      "Firmware turns hardware signals into predictable behavior.",
      "Edge AI matters when latency, privacy, or connectivity limits cloud use."
    ],
    resources: [
      {
        title: "Cyber-Physical Systems: Design Challenges",
        author: "Edward A. Lee",
        year: 2008,
        whyItMatters:
          "Explains why software that touches the physical world needs timing, feedback, and safety discipline.",
        url: "https://ptolemy.berkeley.edu/publications/papers/08/CPSDesignChallenges/",
        tag: "Cyber-physical systems"
      },
      {
        title: "Embedded Systems - Shape the World",
        author: "Jonathan Valvano and Ramesh Yerraballi",
        whyItMatters:
          "A practical primer on microcontrollers, sensors, memory, real-time constraints, and power limits.",
        url: "https://users.ece.utexas.edu/~valvano/Volume1/",
        tag: "Embedded primer"
      },
      {
        title: "Introduction to Embedded Systems: A Cyber-Physical Systems Approach",
        author: "Edward A. Lee and Sanjit A. Seshia",
        year: 2017,
        whyItMatters:
          "Connects embedded software to models of computation, feedback, timing, and physical constraints.",
        url: "https://ptolemy.berkeley.edu/books/leeseshia/",
        tag: "CPS primer"
      }
    ],
    bridge:
      "Hardware and robotics stories usually depend on what can run locally, how much power it needs, and how safely it responds to the physical world.",
    categoryIds: ["embedded-systems"]
  },
  {
    id: "computer-systems-basics",
    title: "Computer systems basics",
    deck: "The layers beneath software: compute, memory, storage, and networks.",
    points: [
      "Performance is a tradeoff across CPU, memory, storage, and network paths.",
      "Abstractions hide complexity until latency, cost, or failures expose it.",
      "Measure bottlenecks before optimizing them."
    ],
    resources: [
      {
        title: "The Google File System",
        author: "Ghemawat, Gobioff, and Leung",
        year: 2003,
        whyItMatters:
          "A foundational look at building reliable storage from many failure-prone machines.",
        url: "https://research.google/pubs/the-google-file-system/",
        tag: "Distributed storage"
      },
      {
        title: "MapReduce: Simplified Data Processing on Large Clusters",
        author: "Dean and Ghemawat",
        year: 2004,
        whyItMatters:
          "Clarifies the programming model that shaped large-scale batch data systems.",
        url: "https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/",
        tag: "Distributed compute"
      },
      {
        title: "In Search of an Understandable Consensus Algorithm",
        author: "Ongaro and Ousterhout",
        year: 2014,
        whyItMatters:
          "Introduces Raft, a readable foundation for leader election, replication, and consensus tradeoffs.",
        url: "https://raft.github.io/raft.pdf",
        tag: "Consensus"
      }
    ],
    bridge:
      "Systems stories often explain why a service became faster, slower, cheaper, or more reliable after engineers changed a lower layer.",
    categoryIds: ["computer-systems"]
  },
  {
    id: "developer-tools-open-source-basics",
    title: "Developer Tools / Open Source basics",
    deck: "The social and technical systems behind shared software work.",
    points: [
      "Open source work depends on readable history, review, licensing, and maintainership.",
      "Developer tools succeed when they reduce feedback loops without hiding important state.",
      "Healthy collaboration needs clear contribution paths and predictable release practices."
    ],
    resources: [
      {
        title: "The Cathedral and the Bazaar",
        author: "Eric S. Raymond",
        year: 1997,
        whyItMatters:
          "A canonical essay on open source development models, maintainership, and community feedback loops.",
        url: "https://www.catb.org/~esr/writings/cathedral-bazaar/",
        tag: "Open source"
      },
      {
        title: "Git Handbook",
        author: "GitHub Docs",
        whyItMatters:
          "A concise primer for commits, branches, pull requests, and collaborative source control.",
        url: "https://docs.github.com/en/get-started/using-git/about-git",
        tag: "Git"
      },
      {
        title: "Pro Git",
        author: "Scott Chacon and Ben Straub",
        year: 2014,
        whyItMatters:
          "Explains the data model and workflows behind the version-control tool most open source projects use.",
        url: "https://git-scm.com/book/en/v2",
        tag: "Version control"
      }
    ],
    bridge:
      "Tooling and open source stories are easier to judge when you can see who maintains the project, how changes land, and whether the workflow improves developer feedback.",
    categoryIds: ["developer-tools-open-source"]
  },
  {
    id: "cloud-infrastructure-basics",
    title: "Cloud/infrastructure basics",
    deck: "The operational foundation for running software at scale.",
    points: [
      "Cloud systems trade control for elasticity, managed services, and speed.",
      "Reliability comes from redundancy, observability, and recovery practice.",
      "Infrastructure choices shape cost, latency, and developer workflow."
    ],
    resources: [
      {
        title: "Dynamo: Amazon's Highly Available Key-value Store",
        author: "DeCandia et al.",
        year: 2007,
        whyItMatters:
          "Explains availability, replication, consistency, and partition tolerance in a production cloud store.",
        url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
        tag: "Cloud storage"
      },
      {
        title: "Borg, Omega, and Kubernetes",
        author: "Burns et al.",
        year: 2016,
        whyItMatters:
          "Connects Google's cluster-management history to modern Kubernetes orchestration patterns.",
        url: "https://queue.acm.org/detail.cfm?id=2898444",
        tag: "Orchestration"
      },
      {
        title: "Cloud Infrastructure Primer",
        author: "Google Cloud Architecture Center",
        whyItMatters:
          "Grounds compute, storage, networking, orchestration, and observability in practical architecture language.",
        url: "https://cloud.google.com/architecture/framework",
        tag: "Infrastructure"
      }
    ],
    bridge:
      "Cloud stories usually connect business needs to operational tradeoffs: scale, reliability, latency, cost, and who carries the on-call burden.",
    categoryIds: ["cloud-infrastructure"]
  }
] as const satisfies readonly LearningFoundation[];

const LEARNING_CATEGORY_IDS = Array.from(
  new Set(LEARNING_FOUNDATIONS.flatMap((foundation) => foundation.categoryIds))
);

function byNewestPublished(a: NewsItem, b: NewsItem) {
  return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
}

function dedupeById(items: NewsItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function isStarterItem(item: NewsItem) {
  return item.tags.includes("starter") || item.id.startsWith("starter-");
}

export function getLearningCurrentContext(dailyNews: DailyNews, limit = 6) {
  const relevantCategoryIds = new Set<CategoryId>(LEARNING_CATEGORY_IDS);
  const now = new Date(dailyNews.refreshedAt);
  const relevantItems = Object.values(dailyNews.categories)
    .flat()
    .filter(
      (item) =>
        relevantCategoryIds.has(item.category) &&
        isFreshNewsItem(item, now) &&
        !isStarterItem(item)
    );

  return dedupeById(relevantItems).sort(byNewestPublished).slice(0, Math.max(0, limit));
}

export function getLearningBridges(dailyNews: DailyNews): LearningBridge[] {
  const now = new Date(dailyNews.refreshedAt);

  return LEARNING_FOUNDATIONS.map((foundation) => {
    const story = dedupeById(
      foundation.categoryIds.flatMap((categoryId) => dailyNews.categories[categoryId] ?? [])
    )
      .filter((item) => isFreshNewsItem(item, now) && !isStarterItem(item))
      .sort(byNewestPublished)[0];

    return {
      foundation,
      story
    };
  });
}
