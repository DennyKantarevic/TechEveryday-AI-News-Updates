import { NextRequest, NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  return value;
}

function loginRedirect(requestUrl: URL, message: string) {
  return NextResponse.redirect(
    new URL(`/login?message=${encodeURIComponent(message)}`, requestUrl.origin)
  );
}

function safeCallbackErrorMessage(message: string | null) {
  return (message ?? "Unknown Supabase auth callback error.")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token]")
    .slice(0, 300);
}

function logCallbackError(
  event: "provider_error" | "exchange_failed" | "verify_failed" | "missing_params",
  detail: Record<string, unknown>
) {
  console.error("[auth:callback]", event, detail);
}

const allowedOtpTypes = new Set([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change"
]);

function safeOtpType(value: string | null): EmailOtpType | null {
  if (!value || !allowedOtpTypes.has(value)) {
    return null;
  }

  return value as EmailOtpType;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = safeOtpType(requestUrl.searchParams.get("type"));
  const callbackError = requestUrl.searchParams.get("error");
  const callbackErrorDescription = requestUrl.searchParams.get("error_description");
  const next = safeNextPath(requestUrl.searchParams.get("next"));
  const supabase = await createServerSupabaseClient();

  if (callbackError || callbackErrorDescription) {
    logCallbackError("provider_error", {
      error: callbackError ?? null,
      message: safeCallbackErrorMessage(callbackErrorDescription)
    });
    return loginRedirect(requestUrl, "auth-callback-error");
  }

  if (!supabase) {
    return loginRedirect(requestUrl, "auth-unconfigured");
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      logCallbackError("exchange_failed", {
        name: error.name ?? null,
        status: "status" in error ? error.status : null,
        message: safeCallbackErrorMessage(error.message)
      });
      return loginRedirect(requestUrl, "auth-callback-error");
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type
    });

    if (error) {
      logCallbackError("verify_failed", {
        name: error.name ?? null,
        status: "status" in error ? error.status : null,
        message: safeCallbackErrorMessage(error.message)
      });
      return loginRedirect(requestUrl, "auth-callback-error");
    }

    return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  logCallbackError("missing_params", {
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    hasType: Boolean(type)
  });

  return loginRedirect(requestUrl, "auth-callback-missing");
}
