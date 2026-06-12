import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/config/categories";

describe("category labels", () => {
  it("uses the full visible label for the AI category", () => {
    const aiCategory = CATEGORIES.find((category) => category.id === "ai-ml");

    expect(aiCategory?.title).toBe("Artificial Intelligence / Machine Learning");
    expect(CATEGORIES.map((category) => category.title)).not.toContain("AI / ML");
  });

  it("does not expose Cybersecurity as a site category", () => {
    expect(CATEGORIES.map((category) => category.id)).toEqual([
      "ai-ml",
      "automation-agentic-systems",
      "research-papers",
      "embedded-systems",
      "computer-systems",
      "developer-tools-open-source",
      "cloud-infrastructure"
    ]);
    expect(CATEGORIES.map((category) => category.title)).not.toContain("Cybersecurity");
  });
});
