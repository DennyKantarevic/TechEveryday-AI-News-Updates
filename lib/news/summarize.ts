const FALLBACK_SUMMARY =
  "No source excerpt was provided. Open the original source for full context.";

export function stripMarkup(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function summarizeText(input: string, maxSentences = 4) {
  const clean = stripMarkup(input);

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
