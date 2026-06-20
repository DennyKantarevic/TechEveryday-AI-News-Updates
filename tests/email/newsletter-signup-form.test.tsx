import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
  );
});

describe("NewsletterSignupForm", () => {
  it("shows a spam folder note after requesting confirmation email", async () => {
    render(<NewsletterSignupForm />);

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "reader@example.com" }
    });
    fireEvent.click(screen.getByRole("button", { name: /Confirm email/i }));

    expect(await screen.findByText(/check spam or junk/i)).toBeInTheDocument();
    expect(screen.getByText(/mark TechEveryday as not spam/i)).toBeInTheDocument();
  });
});
