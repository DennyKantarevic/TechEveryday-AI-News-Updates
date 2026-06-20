import type { PostgrestError, SupabaseClient, User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type AccountUser = Pick<User, "id" | "email">;
type AccountStorageError = PostgrestError | Error | null | undefined;

function safeText(value: unknown) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[token]")
    .slice(0, 300);
}

function errorCode(error: AccountStorageError) {
  if (error && "code" in error && typeof error.code === "string") {
    return error.code;
  }

  return null;
}

function errorMessage(error: AccountStorageError) {
  if (error && "message" in error) {
    return safeText(error.message);
  }

  return "";
}

export function accountStorageErrorMessage(
  error: AccountStorageError,
  fallback = "We could not update account data right now."
) {
  const code = errorCode(error);
  const message = errorMessage(error);

  if (
    code === "42P01" ||
    code === "42703" ||
    /relation .* does not exist/i.test(message) ||
    /column .* does not exist/i.test(message)
  ) {
    return "Account table is missing. Please apply the Supabase account migration.";
  }

  if (
    code === "42501" ||
    /row-level security/i.test(message) ||
    /permission denied/i.test(message)
  ) {
    return "Permission/RLS blocked this action.";
  }

  if (/jwt|auth|session|signed in/i.test(message)) {
    return "You need to be signed in again.";
  }

  return fallback;
}

export function accountStorageStatus(error: AccountStorageError) {
  return accountStorageErrorMessage(error) === "You need to be signed in again." ? 401 : 500;
}

export function accountStorageErrorResponse(
  error: AccountStorageError,
  scope: string,
  fallback?: string
) {
  logAccountStorageError(scope, error);
  const message = accountStorageErrorMessage(error, fallback);

  return NextResponse.json({ error: message, message }, { status: accountStorageStatus(error) });
}

export function logAccountStorageError(scope: string, error: AccountStorageError) {
  if (!error) {
    return;
  }

  console.error("[account:storage]", scope, {
    code: errorCode(error),
    message: errorMessage(error),
    details:
      error && "details" in error && error.details ? safeText(error.details) : undefined,
    hint: error && "hint" in error && error.hint ? safeText(error.hint) : undefined
  });
}

export async function ensureAccountRows(
  supabase: SupabaseClient,
  user: AccountUser
): Promise<PostgrestError | null> {
  const profileResult = await supabase.from("profiles").upsert(
    {
      user_id: user.id,
      email: user.email ?? ""
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );

  if (profileResult.error) {
    return profileResult.error;
  }

  const preferencesResult = await supabase.from("user_preferences").upsert(
    {
      user_id: user.id
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );

  return preferencesResult.error;
}
