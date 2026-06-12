import type { CategoryId } from "@/config/categories";

export type TrustedXAccount = {
  handle: string;
  displayName: string;
  trustScore: number;
  categoryHints: CategoryId[];
};

export const TRUSTED_X_ACCOUNTS: TrustedXAccount[] = [
  {
    handle: "OpenAI",
    displayName: "OpenAI",
    trustScore: 0.92,
    categoryHints: ["ai-ml", "automation-agentic-systems"]
  },
  {
    handle: "AnthropicAI",
    displayName: "Anthropic",
    trustScore: 0.91,
    categoryHints: ["ai-ml", "automation-agentic-systems"]
  },
  {
    handle: "GoogleDeepMind",
    displayName: "Google DeepMind",
    trustScore: 0.91,
    categoryHints: ["ai-ml", "research-papers"]
  },
  {
    handle: "MSFTResearch",
    displayName: "Microsoft Research",
    trustScore: 0.9,
    categoryHints: ["research-papers", "computer-systems"]
  },
  {
    handle: "github",
    displayName: "GitHub",
    trustScore: 0.88,
    categoryHints: ["developer-tools-open-source", "automation-agentic-systems"]
  },
  {
    handle: "Cloudflare",
    displayName: "Cloudflare",
    trustScore: 0.88,
    categoryHints: ["cloud-infrastructure", "cybersecurity"]
  }
];
