import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import CategorySection from "@/components/CategorySection";
import { CATEGORIES } from "@/config/categories";
import { trackCategoryVisited } from "@/lib/interactions";
import type { NewsItem } from "@/types/news";

vi.mock("@/lib/interactions", () => ({
  trackCategoryVisited: vi.fn()
}));

vi.mock("@/components/NewsCard", () => ({
  default: ({ item }: { item: NewsItem }) => <article>{item.title}</article>
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    motion: {
      section: ({
        children,
        initial,
        whileInView,
        viewport,
        ...props
      }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => (
        <section {...props}>{children}</section>
      ),
      div: ({
        children,
        variants,
        custom,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...props}>{children}</div>
      )
    },
    useReducedMotion: () => true
  };
});

const item: NewsItem = {
  id: "category-tracked",
  title: "Cloud reliability update",
  summary: "Cloud teams improve tracing for production systems.",
  url: "https://example.com/cloud",
  sourceName: "Example Source",
  sourceType: "news",
  category: "cloud-infrastructure",
  publishedAt: "2026-06-12T08:00:00.000Z",
  foundAt: "2026-06-12T09:00:00.000Z",
  imageUrl: "placeholder:cloud-infrastructure",
  trustScore: 0.82,
  saved: false,
  tags: ["cloud"]
};

describe("CategorySection interaction tracking", () => {
  it("records a category visit when the section renders", () => {
    const category = CATEGORIES.find((entry) => entry.id === "cloud-infrastructure");

    if (!category) {
      throw new Error("Expected cloud category fixture");
    }

    render(<CategorySection category={category} items={[item]} />);

    expect(trackCategoryVisited).toHaveBeenCalledWith("cloud-infrastructure");
  });
});
