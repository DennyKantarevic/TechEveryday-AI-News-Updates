import type { CategoryId } from "@/config/categories";
import type { DailyNews, NewsItem } from "@/types/news";

export type LearningFoundation = {
  id: string;
  title: string;
  deck: string;
  points: readonly string[];
  bridge: string;
  categoryIds: readonly CategoryId[];
};

export type LearningBridge = {
  foundation: LearningFoundation;
  story?: NewsItem;
};

export const LEARNING_FOUNDATIONS = [
  {
    id: "ai-ml-basics",
    title: "AI / ML basics",
    deck: "How models learn patterns, make predictions, and fail in practice.",
    points: [
      "Models learn statistical patterns from examples, not intent.",
      "Training creates behavior; inference applies it to new inputs.",
      "Good evaluation checks accuracy, cost, bias, and failure cases."
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
    bridge:
      "Agent stories are easier to judge by asking what tools are connected, what the system is allowed to change, and where humans remain in the loop.",
    categoryIds: ["automation-agentic-systems"]
  },
  {
    id: "research-paper-reading-basics",
    title: "Research paper reading basics",
    deck: "A compact way to separate signal from hype in technical papers.",
    points: [
      "Start with the problem, method, evidence, and stated limits.",
      "Treat benchmarks as clues, not proof of real-world usefulness.",
      "Read figures and ablations before accepting the conclusion."
    ],
    bridge:
      "Research news becomes clearer when you identify the claim, the baseline it beats, and the assumptions that may not survive outside the paper.",
    categoryIds: ["research-papers"]
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
    bridge:
      "Systems stories often explain why a service became faster, slower, cheaper, or more reliable after engineers changed a lower layer.",
    categoryIds: ["computer-systems"]
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
    bridge:
      "Hardware and robotics stories usually depend on what can run locally, how much power it needs, and how safely it responds to the physical world.",
    categoryIds: ["embedded-systems"]
  },
  {
    id: "cybersecurity-basics",
    title: "Cybersecurity basics",
    deck: "How defenders reason about identity, vulnerabilities, and risk.",
    points: [
      "Security starts with assets, trust boundaries, and likely threats.",
      "Most incidents combine a technical weakness with access or process gaps.",
      "Good defenses reduce blast radius and improve detection."
    ],
    bridge:
      "Security news is more useful when you can spot the affected asset, the path attackers used, and the controls that would have limited damage.",
    categoryIds: ["cybersecurity"]
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
  const relevantItems = Object.values(dailyNews.categories)
    .flat()
    .filter((item) => relevantCategoryIds.has(item.category) && !isStarterItem(item));

  return dedupeById(relevantItems).sort(byNewestPublished).slice(0, Math.max(0, limit));
}

export function getLearningBridges(dailyNews: DailyNews): LearningBridge[] {
  return LEARNING_FOUNDATIONS.map((foundation) => {
    const story = dedupeById(
      foundation.categoryIds.flatMap((categoryId) => dailyNews.categories[categoryId] ?? [])
    )
      .filter((item) => !isStarterItem(item))
      .sort(byNewestPublished)[0];

    return {
      foundation,
      story
    };
  });
}
