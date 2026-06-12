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
        <article
          data-viewport-amount={String(
            (viewport as { amount?: number } | undefined)?.amount ?? ""
          )}
          data-viewport-margin={String(
            (viewport as { margin?: string } | undefined)?.margin ?? ""
          )}
          data-viewport-once={String(
            (viewport as { once?: boolean } | undefined)?.once ?? ""
          )}
          data-while-in-view={String(whileInView ?? "")}
          {...props}
        >
          {children}
        </article>
      )
    },
    useReducedMotion: () => false
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

  it("formats internal category tags for display", () => {
    render(
      <NewsCard
        item={{
          ...item,
          category: "ai-ml",
          tags: ["ai-ml", "transformers"]
        }}
      />
    );

    expect(
      screen.getAllByText("Artificial Intelligence / Machine Learning").length
    ).toBeGreaterThan(0);
    expect(screen.queryByText("ai-ml")).toBeNull();
  });

  it("replays standalone card entrance animations with later viewport timing", () => {
    render(<NewsCard item={item} />);

    const article = screen.getByRole("article");

    expect(article).toHaveAttribute("data-while-in-view", "visible");
    expect(article).toHaveAttribute("data-viewport-once", "false");
    expect(Number(article.getAttribute("data-viewport-amount"))).toBeGreaterThanOrEqual(0.45);
    expect(article).toHaveAttribute("data-viewport-margin", "0px 0px -12% 0px");
  });
});
