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
        const typedViewport = viewport as { amount?: number; once?: boolean } | undefined;
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
  it("slides section headers from alternating sides as they enter the viewport", () => {
    render(
      <AnimatedSectionHeader direction="left" data-testid="animated-header">
        <h2>Artificial Intelligence / Machine Learning</h2>
      </AnimatedSectionHeader>
    );

    const header = screen.getByTestId("animated-header");

    expect(header).toHaveAttribute("data-custom", "-1");
    expect(header).toHaveAttribute("data-viewport-amount", "0.25");
    expect(header).toHaveAttribute("data-viewport-once", "true");
    expect(header).toHaveAttribute("data-while-in-view", "visible");
  });

  it("delays article grid children until the header animation can settle", () => {
    render(
      <AnimatedArticleGrid data-testid="animated-grid">
        <article>First card</article>
        <article>Second card</article>
      </AnimatedArticleGrid>
    );

    const grid = screen.getByTestId("animated-grid");

    expect(Number(grid.getAttribute("data-delay-children"))).toBeGreaterThanOrEqual(0.5);
    expect(Number(grid.getAttribute("data-stagger-children"))).toBeGreaterThan(0);
  });
});
