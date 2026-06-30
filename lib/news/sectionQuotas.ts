import type { CategoryId } from "@/config/categories";

export const MIN_ITEMS_PER_SECTION = 4;
export const MAX_ITEMS_PER_SECTION = 5;

export const REQUIRED_SECTION_IDS = [
  "ai-ml",
  "automation-agentic-systems",
  "embedded-systems",
  "computer-systems",
  "developer-tools-open-source",
  "cloud-infrastructure"
] as const satisfies readonly CategoryId[];
