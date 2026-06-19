"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { appUrl, PRODUCTION_APP_BASE_URL } from "@/lib/url/appBaseUrl";

type SafeAuthErrorCategory =
  | "rate_limit"
  | "invalid_redirect_url"
  | "email_provider_disabled"
  | "email_send_failed"
  | "invalid_email"
  | "unknown";

type SafeAuthError = {
  name?: string;
  message?: string;
  status?: number;
  code?: string;
};

function cleanEmail(formData: FormData) {
  return String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
}

function authCallbackUrl() {
  if (process.env.NODE_ENV === "development") {
    return appUrl("/auth/callback");
  }

  return `${PRODUCTION_APP_BASE_URL}/auth/callback`;
}

function normalizeAuthError(error: unknown): SafeAuthError {
  if (!error || typeof error !== "object") {
    return {};
  }

  const record = error as Record<string, unknown>;
  return {
    name: typeof record.name === "string" ? record.name : undefined,
    message: typeof record.message === "string" ? record.message : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
    code: typeof record.code === "string" ? record.code : undefined
  };
}

function safeAuthErrorMessage(message: string | undefined) {
  return (message ?? "Unknown Supabase auth error.")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token]")
    .slice(0, 300);
}

function classifyAuthError(error: unknown): SafeAuthErrorCategory {
  const normalized = normalizeAuthError(error);
  const message = (normalized.message ?? "").toLowerCase();
  const code = (normalized.code ?? "").toLowerCase();

  if (normalized.status === 429 || code.includes("rate") || message.includes("rate limit")) {
    return "rate_limit";
  }

  if (
    message.includes("redirect") ||
    message.includes("not allowed") ||
    code.includes("redirect")
  ) {
    return "invalid_redirect_url";
  }

  if (
    message.includes("email provider") ||
    message.includes("email logins are disabled") ||
    message.includes("provider is disabled")
  ) {
    return "email_provider_disabled";
  }

  if (
    message.includes("smtp") ||
    message.includes("send email") ||
    message.includes("sending") ||
    message.includes("email service")
  ) {
    return "email_send_failed";
  }

  if (message.includes("invalid email") || message.includes("email address")) {
    return "invalid_email";
  }

  return "unknown";
}

function messageForAuthError(
  flow: "signin" | "signup",
  category: SafeAuthErrorCategory
) {
  const prefix = flow === "signin" ? "signin" : "signup";

  switch (category) {
    case "rate_limit":
      return `${prefix}-rate-limited`;
    case "invalid_redirect_url":
      return `${prefix}-invalid-redirect`;
    case "email_provider_disabled":
      return `${prefix}-email-disabled`;
    case "email_send_failed":
      return `${prefix}-email-send-failed`;
    case "invalid_email":
      return `${prefix}-invalid-email`;
    case "unknown":
      return `${prefix}-failed`;
  }
}

function logAuthError({
  event,
  error,
  redirectTo
}: {
  event: "sign_in_failed" | "sign_up_failed";
  error: unknown;
  redirectTo: string;
}) {
  const normalized = normalizeAuthError(error);
  const category = classifyAuthError(error);

  console.error("[auth:magic-link]", event, {
    category,
    name: normalized.name ?? null,
    status: normalized.status ?? null,
    code: normalized.code ?? null,
    message: safeAuthErrorMessage(normalized.message),
    redirectTo
  });

  return category;
}

export async function signInWithMagicLink(formData: FormData) {
  const email = cleanEmail(formData);
  const supabase = await createServerSupabaseClient();
  const redirectTo = authCallbackUrl();

  if (!email) {
    redirect("/login?message=missing-email");
  }

  if (!supabase) {
    redirect("/login?message=auth-unconfigured");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo
    }
  });

  if (error) {
    const category = logAuthError({
      event: "sign_in_failed",
      error,
      redirectTo
    });
    redirect(`/login?message=${messageForAuthError("signin", category)}`);
  }

  redirect("/login?message=check-email");
}

export async function signUpWithMagicLink(formData: FormData) {
  const email = cleanEmail(formData);
  const supabase = await createServerSupabaseClient();
  const redirectTo = authCallbackUrl();

  if (!email) {
    redirect("/signup?message=missing-email");
  }

  if (!supabase) {
    redirect("/signup?message=auth-unconfigured");
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true
    }
  });

  if (error) {
    const category = logAuthError({
      event: "sign_up_failed",
      error,
      redirectTo
    });
    redirect(`/signup?message=${messageForAuthError("signup", category)}`);
  }

  redirect("/signup?message=check-email");
}
