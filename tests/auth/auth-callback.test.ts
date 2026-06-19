import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  verifyOtp: vi.fn(),
  createServerSupabaseClient: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

describe("auth callback route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.verifyOtp.mockResolvedValue({ error: null });
  });

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

  it("verifies token_hash callbacks and redirects to the safe next path", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    mocks.verifyOtp.mockResolvedValueOnce({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        verifyOtp: mocks.verifyOtp
      }
    });

    const response = await GET(
      new NextRequest(
        "https://tech-everyday-ai-news-updates.vercel.app/auth/callback?token_hash=token-value&type=email&next=/gallery"
      )
    );

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      token_hash: "token-value",
      type: "email"
    });
    expect(response.headers.get("location")).toBe(
      "https://tech-everyday-ai-news-updates.vercel.app/gallery"
    );
  });

  it("redirects callback provider errors to login with a safe message", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        verifyOtp: mocks.verifyOtp
      }
    });

    const response = await GET(
      new NextRequest(
        "https://tech-everyday-ai-news-updates.vercel.app/auth/callback?error=access_denied&error_description=expired"
      )
    );

    expect(response.headers.get("location")).toBe(
      "https://tech-everyday-ai-news-updates.vercel.app/login?message=auth-callback-error"
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.verifyOtp).not.toHaveBeenCalled();
  });

  it("redirects missing callback params to login instead of account", async () => {
    const { GET } = await import("@/app/auth/callback/route");
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: {
        exchangeCodeForSession: mocks.exchangeCodeForSession,
        verifyOtp: mocks.verifyOtp
      }
    });

    const response = await GET(
      new NextRequest("https://tech-everyday-ai-news-updates.vercel.app/auth/callback")
    );

    expect(response.headers.get("location")).toBe(
      "https://tech-everyday-ai-news-updates.vercel.app/login?message=auth-callback-missing"
    );
  });
});
