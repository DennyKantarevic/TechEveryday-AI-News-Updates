import { describe, expect, it } from "vitest";
import { placeholderImageForCategory } from "@/lib/placeholders";
import { CATEGORY_IDS } from "@/config/categories";

function decodePlaceholder(categoryId: (typeof CATEGORY_IDS)[number]) {
  const dataUrl = placeholderImageForCategory(categoryId, "Research benchmark");
  const encodedSvg = dataUrl.replace(/^data:image\/svg\+xml;charset=utf-8,/, "");
  return decodeURIComponent(encodedSvg);
}

describe("placeholderImageForCategory", () => {
  it("uses a restrained beige, white, black, and gray palette for every category", () => {
    const allowedColors = new Set([
      "#111111",
      "#6f6a61",
      "#d8ccba",
      "#eee5d6",
      "#f7f1e8",
      "#fffdf8"
    ]);

    for (const categoryId of CATEGORY_IDS) {
      const colors = Array.from(
        new Set(decodePlaceholder(categoryId).match(/#[0-9a-fA-F]{6}/g))
      );

      expect(colors.length).toBeGreaterThan(0);
      expect(colors.every((color) => allowedColors.has(color.toLowerCase()))).toBe(true);
    }
  });
});
