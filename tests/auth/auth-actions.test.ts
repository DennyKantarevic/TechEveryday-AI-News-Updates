import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createServerSupabaseClient: vi.fn(),
  signInWithOtp: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

vi.mock("@/lib/url/appBaseUrl", () => ({
  PRODUCTION_APP_BASE_URL: "https://tech-everyday-ai-news-updates.vercel.app",
  appUrl: (path: string) => `https://tech-everyday-ai-news-updates.vercel.app${path}`
}));

describe("auth server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports missing Supabase config separately from missing email on login", async () => {
    const { signInWithMagicLink } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "reader@example.com");
    mocks.createServerSupabaseClient.mockResolvedValueOnce(null);

    await expect(signInWithMagicLink(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login?message=auth-unconfigured"
    );
  });

  it("reports missing Supabase config separately from missing email on signup", async () => {
    const { signUpWithMagicLink } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "reader@example.com");
    mocks.createServerSupabaseClient.mockResolvedValueOnce(null);

    await expect(signUpWithMagicLink(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/signup?message=auth-unconfigured"
    );
  });

  it("uses the exact production auth callback URL for magic-link emails", async () => {
    const { signInWithMagicLink } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "reader@example.com");
    mocks.signInWithOtp.mockResolvedValueOnce({ error: null });
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithOtp: mocks.signInWithOtp }
    });

    await expect(signInWithMagicLink(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login?message=check-email"
    );

    expect(mocks.signInWithOtp).toHaveBeenCalledWith({
      email: "reader@example.com",
      options: {
        emailRedirectTo:
          "https://tech-everyday-ai-news-updates.vercel.app/auth/callback"
      }
    });
  });

  it("logs and redirects with a rate-limit message when Supabase throttles login email", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { signInWithMagicLink } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "reader@example.com");
    mocks.signInWithOtp.mockResolvedValueOnce({
      error: {
        name: "AuthApiError",
        message: "Email rate limit exceeded",
        status: 429,
        code: "over_email_send_rate_limit"
      }
    });
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithOtp: mocks.signInWithOtp }
    });

    await expect(signInWithMagicLink(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/login?message=signin-rate-limited"
    );

    expect(consoleError).toHaveBeenCalledWith(
      "[auth:magic-link]",
      "sign_in_failed",
      expect.objectContaining({
        category: "rate_limit",
        code: "over_email_send_rate_limit",
        status: 429
      })
    );
  });

  it("redirects with an invalid redirect message for Supabase redirect URL errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { signUpWithMagicLink } = await import("@/lib/auth/actions");
    const formData = new FormData();
    formData.set("email", "reader@example.com");
    mocks.signInWithOtp.mockResolvedValueOnce({
      error: {
        name: "AuthApiError",
        message: "Redirect URL is not allowed",
        status: 400,
        code: "validation_failed"
      }
    });
    mocks.createServerSupabaseClient.mockResolvedValueOnce({
      auth: { signInWithOtp: mocks.signInWithOtp }
    });

    await expect(signUpWithMagicLink(formData)).rejects.toThrow(
      "NEXT_REDIRECT:/signup?message=signup-invalid-redirect"
    );

    expect(consoleError).toHaveBeenCalledWith(
      "[auth:magic-link]",
      "sign_up_failed",
      expect.objectContaining({
        category: "invalid_redirect_url"
      })
    );
  });
});
