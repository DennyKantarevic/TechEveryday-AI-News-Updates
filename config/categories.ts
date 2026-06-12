export const CATEGORIES = [
  {
    id: "ai-ml",
    title: "Artificial Intelligence / Machine Learning",
    deck: "Models, applied machine learning, product releases, and safety updates."
  },
  {
    id: "automation-agentic-systems",
    title: "Automation / Agentic Systems",
    deck: "Agent runtimes, workflow automation, orchestration, and human-in-the-loop systems."
  },
  {
    id: "research-papers",
    title: "Research Papers",
    deck: "arXiv and primary research updates selected for practical technical relevance."
  },
  {
    id: "embedded-systems",
    title: "Embedded Systems",
    deck: "Chips, edge devices, robotics, firmware, and hardware-software interfaces."
  },
  {
    id: "computer-systems",
    title: "Computer Systems",
    deck: "Operating systems, architecture, compilers, storage, and distributed systems."
  },
  {
    id: "developer-tools-open-source",
    title: "Developer Tools / Open Source",
    deck: "Tooling, frameworks, runtimes, GitHub projects, and maintainable developer workflows."
  },
  {
    id: "cybersecurity",
    title: "Cybersecurity",
    deck: "Vulnerabilities, defensive engineering, identity, secure infrastructure, and threat research."
  },
  {
    id: "cloud-infrastructure",
    title: "Cloud / Infrastructure",
    deck: "Cloud platforms, edge networks, observability, reliability, and production operations."
  }
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const CATEGORY_IDS = CATEGORIES.map((category) => category.id) as CategoryId[];

export const CATEGORY_BY_ID = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category])
) as Record<CategoryId, (typeof CATEGORIES)[number]>;

export function createCategoryRecord<T>(
  factory: (categoryId: CategoryId) => T
): Record<CategoryId, T> {
  return Object.fromEntries(
    CATEGORY_IDS.map((categoryId) => [categoryId, factory(categoryId)])
  ) as Record<CategoryId, T>;
}
