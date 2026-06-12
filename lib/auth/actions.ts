"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { appUrl } from "@/lib/url/appBaseUrl";

function cleanEmail(formData: FormData) {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

export async function signInWithMagicLink(formData: FormData) {
  const email = cleanEmail(formData);
  const supabase = await createServerSupabaseClient();

  if (!supabase || !email) {
    redirect("/login?message=missing-email");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: appUrl("/auth/callback")
    }
  });

  if (error) {
    redirect("/login?message=signin-failed");
  }

  redirect("/login?message=check-email");
}

export async function signUpWithMagicLink(formData: FormData) {
  const email = cleanEmail(formData);
  const supabase = await createServerSupabaseClient();

  if (!supabase || !email) {
    redirect("/signup?message=missing-email");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: appUrl("/auth/callback"),
      shouldCreateUser: true
    }
  });

  if (error) {
    redirect("/signup?message=signup-failed");
  }

  redirect("/signup?message=check-email");
}
