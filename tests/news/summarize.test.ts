import { describe, expect, it } from "vitest";
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
