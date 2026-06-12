import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PageTransition, {
  PAGE_TRANSITION_SECONDS,
  routeTransitionDirection
} from "@/components/PageTransition";

vi.mock("next/navigation", () => ({
  usePathname: () => "/learning"
}));

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: ({
        children,
        initial,
        animate,
        exit,
        custom,
        variants,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div
          data-animate={String(animate ?? "")}
          data-custom={String(custom ?? "")}
          data-exit={String(exit ?? "")}
          data-initial={String(initial ?? "")}
          data-initial-x={String(
            (variants as { initial?: (direction: number) => { x?: string } } | undefined)?.initial?.(
              Number(custom)
            )?.x ?? ""
          )}
          data-transition-duration={String(
            (variants as { animate?: { transition?: { duration?: number } } } | undefined)
              ?.animate?.transition?.duration ?? ""
          )}
          {...props}
        >
          {children}
        </div>
      )
    },
    useReducedMotion: () => false
  };
});

beforeEach(() => {
  vi.stubGlobal("scrollTo", vi.fn());
});

describe("PageTransition", () => {
  it("infers route-aware transition directions", () => {
    expect(routeTransitionDirection("/learning")).toBe(-1);
    expect(routeTransitionDirection("/for-you")).toBe(1);
    expect(routeTransitionDirection("/")).toBe(-1);
  });

  it("wraps page content in a motion transition keyed by route", () => {
    render(
      <PageTransition>
        <main>Learning page</main>
      </PageTransition>
    );

    const wrapper = screen.getByTestId("page-transition");

    expect(wrapper).toHaveAttribute("data-custom", "-1");
    expect(wrapper).toHaveAttribute("data-initial", "initial");
    expect(wrapper).toHaveAttribute("data-animate", "animate");
    expect(wrapper).toHaveAttribute("data-exit", "exit");
    expect(wrapper).toHaveAttribute("data-initial-x", "-100vw");
    expect(Number(wrapper.getAttribute("data-transition-duration"))).toBe(
      PAGE_TRANSITION_SECONDS
    );
    expect(PAGE_TRANSITION_SECONDS).toBeGreaterThanOrEqual(0.8);
  });
});
