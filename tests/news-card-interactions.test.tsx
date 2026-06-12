import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewsCard from "@/components/NewsCard";
import {
  trackArticleOpened,
  trackArticleSaved,
  trackArticleViewed,
  trackGallerySaved
} from "@/lib/interactions";
import type { NewsItem } from "@/types/news";

vi.mock("@/lib/interactions", () => ({
  trackArticleOpened: vi.fn(),
  trackArticleSaved: vi.fn(),
  trackArticleViewed: vi.fn(),
  trackGallerySaved: vi.fn()
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    motion: {
      article: ({
        children,
        layout,
        variants,
        initial,
        whileInView,
        viewport,
        transition,
        ...props
      }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => (
        <article {...props}>{children}</article>
      )
    },
    useReducedMotion: () => true
  };
});

const item: NewsItem = {
  id: "tracked-article",
  title: "Agentic AI runtimes improve workflow planning",
  summary: "New orchestration features help teams run reliable AI agents.",
  url: "https://example.com/tracked-article",
  sourceName: "Example Source",
  sourceType: "official",
  category: "automation-agentic-systems",
  publishedAt: "2026-06-12T08:00:00.000Z",
  foundAt: "2026-06-12T09:00:00.000Z",
  imageUrl: "placeholder:automation-agentic-systems",
  trustScore: 0.9,
  saved: false,
  tags: ["agentic AI", "workflow"]
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ item: { ...item, saved: true } })))
  );
});

describe("NewsCard interaction tracking", () => {
  it("records article views on render", () => {
    render(<NewsCard item={item} />);

    expect(trackArticleViewed).toHaveBeenCalledWith(item);
  });

  it("records original article opens", () => {
    render(<NewsCard item={item} />);

    fireEvent.click(screen.getByRole("link", { name: /Original/i }));

    expect(trackArticleOpened).toHaveBeenCalledWith(item);
  });

  it("records article and gallery saves after a successful save", async () => {
    render(<NewsCard item={item} />);

    fireEvent.click(screen.getByRole("button", { name: "Save to gallery" }));

    await waitFor(() => {
      expect(trackArticleSaved).toHaveBeenCalledWith(item);
      expect(trackGallerySaved).toHaveBeenCalledWith(item);
    });
  });
});
