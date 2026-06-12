import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import LearningBridgeList from "@/components/LearningBridgeList";
import LearningCurrentContext from "@/components/LearningCurrentContext";
import LearningFoundations from "@/components/LearningFoundations";
import { LEARNING_FOUNDATIONS } from "@/lib/learning";
import type { LearningBridge } from "@/lib/learning";
import type { NewsItem } from "@/types/news";

function story(id: string, title: string): NewsItem {
  return {
    id,
    title,
    summary: "A concise current story summary.",
    url: `https://example.com/${id}`,
    sourceName: "Example Source",
    sourceType: "official",
    category: "ai-ml",
    publishedAt: "2026-06-12T08:00:00.000Z",
    foundAt: "2026-06-12T08:00:00.000Z",
    imageUrl: "placeholder:test",
    trustScore: 0.9,
    saved: false,
    tags: ["ai-ml", "policy"]
  };
}

describe("LearningFoundations", () => {
  it("renders the stable foundation sections", () => {
    render(<LearningFoundations foundations={LEARNING_FOUNDATIONS} />);

    expect(screen.getByRole("heading", { name: "Foundations" })).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Artificial Intelligence / Machine Learning basics"
      })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Developer Tools / Open Source basics" })
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Cloud/infrastructure basics" })
    ).toBeTruthy();
    expect(screen.getByText("Attention Is All You Need")).toBeTruthy();
    expect(screen.getByText("The Cathedral and the Bazaar")).toBeTruthy();
  });
});

describe("LearningBridgeList", () => {
  it("renders bridge copy with a matching current story", () => {
    const bridges: LearningBridge[] = [
      {
        foundation: LEARNING_FOUNDATIONS[0],
        story: story("current-ai", "A current AI story")
      }
    ];

    render(<LearningBridgeList bridges={bridges} />);

    const link = screen.getByRole("link", { name: /Read current story/i });

    expect(screen.getByRole("heading", { name: "Bridge to Current News" })).toBeTruthy();
    expect(screen.getByText("A current AI story")).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://example.com/current-ai");
  });
});

describe("LearningCurrentContext", () => {
  it("renders concise current article links", () => {
    render(<LearningCurrentContext items={[story("context", "Context article")]} />);

    const link = screen.getByRole("link", { name: /Context article/i });

    expect(screen.getByRole("heading", { name: "Current Context" })).toBeTruthy();
    expect(link.getAttribute("href")).toBe("https://example.com/context");
  });

  it("renders a concise empty state", () => {
    render(<LearningCurrentContext items={[]} />);

    expect(screen.getByText("No matching learning stories in the current feed.")).toBeTruthy();
  });
});
