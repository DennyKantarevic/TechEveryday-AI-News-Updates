import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { accountStorageErrorResponse } from "@/lib/account/storage";
import { getCurrentUser } from "@/lib/auth/get-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const preferencesSchema = z.object({
  displayName: z.string().trim().max(80).optional(),
  personalizationEnabled: z.boolean().optional(),
  preferredCategories: z.array(z.string().trim().min(1)).max(12).optional()
});

async function updatePreferences(request: NextRequest) {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = preferencesSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account settings." }, { status: 400 });
  }

  const { displayName, personalizationEnabled, preferredCategories } = parsed.data;

  if (displayName !== undefined) {
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: user.id,
        email: user.email ?? "",
        display_name: displayName
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return accountStorageErrorResponse(error, "preferences.profile");
    }
  }

  const preferenceUpdate: Record<string, unknown> = {};

  if (personalizationEnabled !== undefined) {
    preferenceUpdate.personalization_enabled = personalizationEnabled;
  }

  if (preferredCategories !== undefined) {
    preferenceUpdate.preferred_categories = preferredCategories;
  }

  if (Object.keys(preferenceUpdate).length) {
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        ...preferenceUpdate
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return accountStorageErrorResponse(error, "preferences.settings");
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: NextRequest) {
  return updatePreferences(request);
}

export async function POST(request: NextRequest) {
  return updatePreferences(request);
}
