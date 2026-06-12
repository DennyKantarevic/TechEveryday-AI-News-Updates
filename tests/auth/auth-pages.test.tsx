import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/login/page";
import SignupPage from "@/app/signup/page";
import AuthButton from "@/components/AuthButton";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } }
      })),
      signOut: vi.fn(async () => ({ error: null }))
    }
  })
}));

vi.mock("@/components/StickyHeader", () => ({
  default: () => <header>Header</header>
}));

describe("auth pages", () => {
  it("renders login with privacy-first account copy", () => {
    render(<LoginPage />);

    expect(screen.getByRole("heading", { name: /Sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/Privacy-first account system/i)).toBeInTheDocument();
  });

  it("renders signup without custom password storage copy", () => {
    render(<SignupPage />);

    expect(screen.getByRole("heading", { name: /Create account/i })).toBeInTheDocument();
    expect(screen.getByText(/Supabase Auth/i)).toBeInTheDocument();
  });

  it("shows sign in when no user is loaded", async () => {
    render(<AuthButton />);

    expect(await screen.findByRole("link", { name: /Sign in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });
});
