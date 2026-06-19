import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  createServerSupabaseClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

describe("auth callback route", () => {
  it("rejects external next redirects", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: { exchangeCodeForSession: mocks.exchangeCodeForSession }
    });

    const response = await GET(
      new NextRequest(
        "https://tech-everyday-ai-news-updates.vercel.app/auth/callback?code=abc&next=https://evil.example/phish"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://tech-everyday-ai-news-updates.vercel.app/account"
    );
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("abc");
  });

  it("keeps safe relative next redirects", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: { exchangeCodeForSession: mocks.exchangeCodeForSession }
    });

    const response = await GET(
      new NextRequest(
        "https://tech-everyday-ai-news-updates.vercel.app/auth/callback?code=abc&next=/gallery"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://tech-everyday-ai-news-updates.vercel.app/gallery"
    );
  });
});
