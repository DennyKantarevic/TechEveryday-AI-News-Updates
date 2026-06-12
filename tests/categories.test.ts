import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/config/categories";

describe("category labels", () => {
  it("uses the full visible label for the AI category", () => {
    const aiCategory = CATEGORIES.find((category) => category.id === "ai-ml");

    expect(aiCategory?.title).toBe("Artificial Intelligence / Machine Learning");
    expect(CATEGORIES.map((category) => category.title)).not.toContain("AI / ML");
  });
});
