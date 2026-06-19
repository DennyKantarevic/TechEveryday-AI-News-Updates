import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  createServerSupabaseClient: vi.fn()
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient
}));

vi.mock("@/lib/url/appBaseUrl", () => ({
  appUrl: (path: string) => `https://tech-everyday-ai-news-updates.vercel.app${path}`
}));

describe("auth server actions", () => {
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
});
