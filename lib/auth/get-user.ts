import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return { supabase: null, user: null };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return { supabase, user: null };
  }

  return { supabase, user: data.user ?? null };
}
