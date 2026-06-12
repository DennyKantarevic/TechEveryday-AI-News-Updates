import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AnimatedArticleGrid from "@/components/AnimatedArticleGrid";
import AnimatedSectionHeader from "@/components/AnimatedSectionHeader";

vi.mock("framer-motion", async () => {
  const actual = await vi.importActual<typeof import("framer-motion")>("framer-motion");

  return {
    ...actual,
    motion: {
      div: ({
        children,
        custom,
        initial,
        whileInView,
        viewport,
        variants,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => {
        const typedViewport = viewport as
          | { amount?: number; once?: boolean; margin?: string }
          | undefined;
        const typedVariants = variants as
          | {
              visible?: {
                transition?: {
                  delayChildren?: number;
                  staggerChildren?: number;
                };
              };
            }
          | undefined;

        return (
          <div
            data-custom={String(custom ?? "")}
            data-delay-children={String(
              typedVariants?.visible?.transition?.delayChildren ?? ""
            )}
            data-stagger-children={String(
              typedVariants?.visible?.transition?.staggerChildren ?? ""
            )}
            data-viewport-amount={String(typedViewport?.amount ?? "")}
            data-viewport-margin={String(typedViewport?.margin ?? "")}
            data-viewport-once={String(typedViewport?.once ?? "")}
            data-while-in-view={String(whileInView ?? "")}
            {...props}
          >
            {children}
          </div>
        );
      }
    },
    useReducedMotion: () => false
  };
});

describe("scroll animation wrappers", () => {
  it("keeps section headers as parent-controlled slide children", () => {
    render(
      <AnimatedSectionHeader direction="left" data-testid="animated-header">
        <h2>Artificial Intelligence / Machine Learning</h2>
      </AnimatedSectionHeader>
    );

    const header = screen.getByTestId("animated-header");

    expect(header).toHaveAttribute("data-custom", "-1");
    expect(header).toHaveAttribute("data-viewport-amount", "");
    expect(header).toHaveAttribute("data-viewport-margin", "");
    expect(header).toHaveAttribute("data-viewport-once", "");
    expect(header).toHaveAttribute("data-while-in-view", "");
  });

  it("keeps article grid children parent-controlled and delayed until the header settles", () => {
    render(
      <AnimatedArticleGrid data-testid="animated-grid">
        <article>First card</article>
        <article>Second card</article>
      </AnimatedArticleGrid>
    );

    const grid = screen.getByTestId("animated-grid");

    expect(grid).toHaveAttribute("data-viewport-amount", "");
    expect(grid).toHaveAttribute("data-viewport-margin", "");
    expect(grid).toHaveAttribute("data-viewport-once", "");
    expect(grid).toHaveAttribute("data-while-in-view", "");
    expect(Number(grid.getAttribute("data-delay-children"))).toBeGreaterThanOrEqual(0.5);
    expect(Number(grid.getAttribute("data-stagger-children"))).toBeGreaterThan(0);
  });
});
