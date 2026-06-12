import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it } from "vitest";
import BrandWordmark from "@/components/BrandWordmark";

describe("BrandWordmark", () => {
  it("renders Tech and Everyday as one brand with distinct Everyday styling", () => {
    render(<BrandWordmark />);

    expect(screen.getByText("Tech")).toHaveClass("brand-wordmark__tech");
    expect(screen.getByText("Everyday")).toHaveClass("brand-wordmark__everyday");
    expect(screen.getByText("Tech").parentElement).toHaveTextContent("TechEveryday");
  });
});
