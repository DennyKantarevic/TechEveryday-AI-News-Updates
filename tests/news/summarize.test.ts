import { describe, expect, it } from "vitest";
import { normalizeSummary, normalizeTitle } from "@/lib/news/normalizeContent";
import { summarizeText } from "@/lib/news/summarize";

describe("summarizeText", () => {
  it("strips markup and limits summaries to four sentences", () => {
    const summary = summarizeText(
      "<p>First sentence about the update.</p><p>Second sentence has detail.</p> Third sentence adds context. Fourth sentence adds impact. Fifth sentence should not appear."
    );

    expect(summary).toBe(
      "First sentence about the update. Second sentence has detail. Third sentence adds context. Fourth sentence adds impact."
    );
  });

  it("uses a plain fallback when no source excerpt is available", () => {
    expect(summarizeText("")).toBe(
      "No source excerpt was provided. Open the original source for full context."
    );
  });
});

describe("content normalization", () => {
  it("cleans LaTeX and math wrappers from research titles before display", () => {
    expect(
      normalizeTitle(
        "$\\texttt{WEAVER}$, Better, Faster, Longer: An Effective World Model for Robotic Manipulation"
      )
    ).toBe(
      "WEAVER, Better, Faster, Longer: An Effective World Model for Robotic Manipulation"
    );
  });

  it("decodes entities and keeps numeric zeroes intact in summaries", () => {
    expect(
      normalizeSummary(
        "Runs 4$\\times$ faster with \\textbf{0-shot} transfer &amp; \\emph{lower latency}."
      )
    ).toBe("Runs 4x faster with 0-shot transfer & lower latency.");
  });

  it("normalizes common publishing entities in titles", () => {
    expect(normalizeTitle("Latency &mdash; reliability &amp; cost&nbsp;tradeoffs")).toBe(
      "Latency - reliability & cost tradeoffs"
    );
  });
});
