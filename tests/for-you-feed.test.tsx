import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForYouFeed from "@/components/ForYouFeed";
import { INTERACTIONS_STORAGE_KEY } from "@/lib/interactions";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    motion: {
      div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
        <div {...props}>{children}</div>
      )
    }
  };
});

describe("ForYouFeed", () => {
  const storage = new Map<string, string>();

  beforeEach(() => {
    storage.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value)
      }
    });
  });

  it("renders a safe empty state with no interaction history", () => {
    render(<ForYouFeed articles={[]} learningFoundations={[]} />);

    expect(
      screen.getByText("Start reading and saving articles to personalize this page.")
    ).toBeInTheDocument();
  });

  it("does not crash when localStorage contains malformed interaction data", () => {
    window.localStorage.setItem(INTERACTIONS_STORAGE_KEY, "{bad json");

    render(<ForYouFeed articles={[]} learningFoundations={[]} />);

    expect(
      screen.getByText("Start reading and saving articles to personalize this page.")
    ).toBeInTheDocument();
  });

  it("renders a privacy-respecting state when account personalization is disabled", () => {
    render(
      <ForYouFeed
        articles={[]}
        learningFoundations={[]}
        initialEvents={[]}
        personalizationEnabled={false}
      />
    );

    expect(screen.getByText("Personalization is off")).toBeInTheDocument();
    expect(screen.getByText(/Turn personalization back on in Account settings/i)).toBeInTheDocument();
  });
});
