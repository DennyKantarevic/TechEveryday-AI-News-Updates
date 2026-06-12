import { normalizeSummary } from "@/lib/news/normalizeContent";

const FALLBACK_SUMMARY =
  "No source excerpt was provided. Open the original source for full context.";

export function stripMarkup(input: string) {
  return normalizeSummary(input);
}

export function summarizeText(input: string, maxSentences = 4) {
  const clean = normalizeSummary(input);

  if (!clean) {
    return FALLBACK_SUMMARY;
  }

  const sentences = clean.match(/[^.!?]+[.!?]+(?:\s|$)/g);

  if (!sentences?.length) {
    return clean.length > 260 ? `${clean.slice(0, 257).trim()}...` : clean;
  }

  return sentences
    .slice(0, maxSentences)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

// Future hook: replace this deterministic excerpting with an LLM summarizer when
// OPENAI_API_KEY or another provider key is configured.
export async function summarizeCandidate(input: string) {
  return summarizeText(input, 3);
}
