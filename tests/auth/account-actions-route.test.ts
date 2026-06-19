import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn()
}));

vi.mock("@/lib/auth/get-user", () => ({
  getCurrentUser: mocks.getCurrentUser
}));

import { POST as clearAccountData } from "@/app/api/account/clear-history/route";
import { PATCH as saveAccountPreferences } from "@/app/api/account/preferences/route";

function jsonRequest(body: unknown) {
  return new Request("https://example.com/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

function createSupabaseMock() {
  const calls: Array<Record<string, unknown>> = [];
  const client = {
    from: vi.fn((table: string) => ({
      upsert: vi.fn(async (payload, options) => {
        calls.push({ method: "upsert", table, payload, options });
        return { error: null };
      }),
      delete: vi.fn(() => ({
        eq: vi.fn(async (column: string, value: string) => {
          calls.push({ method: "delete", table, column, value });
          return { error: null };
        })
      }))
    }))
  };

  return { calls, client };
}

describe("account API actions", () => {
  it("bootstraps missing profile and preference rows when saving account settings", async () => {
    const supabase = createSupabaseMock();
    mocks.getCurrentUser.mockResolvedValue({
      supabase: supabase.client,
      user: { id: "user-1", email: "denny@example.com" }
    });

    const response = await saveAccountPreferences(
      jsonRequest({ displayName: "Denny", personalizationEnabled: false })
    );

    expect(response.status).toBe(200);
    expect(supabase.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "upsert",
          table: "profiles",
          payload: expect.objectContaining({
            user_id: "user-1",
            email: "denny@example.com",
            display_name: "Denny"
          }),
          options: expect.objectContaining({ onConflict: "user_id" })
        }),
        expect.objectContaining({
          method: "upsert",
          table: "user_preferences",
          payload: expect.objectContaining({
            user_id: "user-1",
            personalization_enabled: false
          }),
          options: expect.objectContaining({ onConflict: "user_id" })
        })
      ])
    );
  });

  it("returns a specific safe error when account storage tables are missing", async () => {
    const client = {
      from: vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn(async () => ({
            error: {
              code: "42P01",
              message: 'relation "public.reading_events" does not exist'
            }
          }))
        }))
      }))
    };
    mocks.getCurrentUser.mockResolvedValue({
      supabase: client,
      user: { id: "user-1", email: "denny@example.com" }
    });

    const response = await clearAccountData(jsonRequest({ target: "history" }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toMatch(/Account table is missing/i);
  });
});
