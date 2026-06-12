"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function appBaseUrl() {
  return process.env.APP_BASE_URL || "http://localhost:3000";
}

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
      emailRedirectTo: `${appBaseUrl()}/auth/callback`
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
      emailRedirectTo: `${appBaseUrl()}/auth/callback`,
      shouldCreateUser: true
    }
  });

  if (error) {
    redirect("/signup?message=signup-failed");
  }

  redirect("/signup?message=check-email");
}
