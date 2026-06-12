const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  hellip: "...",
  ldquo: '"',
  lsquo: "'",
  mdash: "-",
  ndash: "-",
  gt: ">",
  lt: "<",
  nbsp: " ",
  quot: '"',
  rdquo: '"',
  rsquo: "'"
};

function decodeHtmlEntities(input: string) {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    const lower = entity.toLowerCase();

    if (lower.startsWith("#x")) {
      const value = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }

    if (lower.startsWith("#")) {
      const value = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }

    return HTML_ENTITIES[lower] ?? match;
  });
}

function stripHtml(input: string) {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

function unwrapLatexCommands(input: string) {
  let output = input;

  for (let index = 0; index < 4; index += 1) {
    const next = output.replace(
      /\\(?:texttt|textbf|textit|emph|mathrm|mathbf|mathit|operatorname)\{([^{}]*)\}/g,
      "$1"
    );

    if (next === output) {
      break;
    }

    output = next;
  }

  return output;
}

function normalizeLatex(input: string) {
  return unwrapLatexCommands(input)
    .replace(/\$+\s*([^$]+?)\s*\$+/g, "$1")
    .replace(/\\times\b/g, "x")
    .replace(/\\cdot\b/g, "*")
    .replace(/\\(?:left|right)\b/g, "")
    .replace(/\\([%&_#$])/g, "$1")
    .replace(/\\-/g, "-")
    .replace(/[{}]/g, "");
}

function normalizeWhitespaceAndPunctuation(input: string) {
  return input
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\b[oO]-shot\b/g, "0-shot")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:!?]){2,}/g, "$1")
    .replace(/\.{4,}/g, "...")
    .replace(/\s*([/])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeContentText(input: string) {
  return normalizeWhitespaceAndPunctuation(
    normalizeLatex(decodeHtmlEntities(stripHtml(input || "")))
  );
}

export function normalizeTitle(input: string) {
  return normalizeContentText(input)
    .replace(/^\s*[-–—:|]+\s*/, "")
    .replace(/\s*[-–—:|]+\s*$/, "")
    .trim();
}

export function normalizeSummary(input: string) {
  return normalizeContentText(input);
}
