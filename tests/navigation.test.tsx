import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StickyHeader from "@/components/StickyHeader";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    motion: {
      header: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
        <header {...props}>{children}</header>
      )
    },
    useScroll: () => ({ scrollY: 0 }),
    useTransform: () => 1
  };
});

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("StickyHeader", () => {
  it("links to newsletter, learning, for you, gallery, and calendar in nav order", () => {
    render(<StickyHeader alwaysVisible />);

    expect(screen.getByRole("link", { name: "Newsletter" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Calendar" })).toHaveAttribute(
      "href",
      "/calendar"
    );
    expect(screen.getByRole("link", { name: "Learning" })).toHaveAttribute("href", "/learning");
    expect(screen.getByRole("link", { name: "For You" })).toHaveAttribute("href", "/for-you");
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/gallery");

    const labels = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("aria-label"))
      .filter(Boolean);

    expect(labels).toEqual(
      expect.arrayContaining(["Newsletter", "Learning", "For You", "Gallery", "Calendar"])
    );
    expect(labels.slice(0, 5)).toEqual([
      "Newsletter",
      "Learning",
      "For You",
      "Gallery",
      "Calendar"
    ]);
  });

  it("resets scroll when the Newsletter tab is clicked", () => {
    render(<StickyHeader alwaysVisible />);

    fireEvent.click(screen.getByRole("link", { name: "Newsletter" }));

    expect(window.scrollTo).toHaveBeenCalledWith({ left: 0, top: 0 });
  });

  it("keeps the centered brand wordmark from intercepting navigation tab clicks", () => {
    render(<StickyHeader alwaysVisible />);

    expect(screen.getByTestId("sticky-brand-wordmark")).toHaveClass("pointer-events-none");
  });
});
