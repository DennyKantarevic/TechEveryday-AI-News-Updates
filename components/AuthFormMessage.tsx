"use client";

import { useSearchParams } from "next/navigation";

const messages: Record<string, string> = {
  "auth-unconfigured":
    "Account login is not configured in this deployment. Add the Supabase Vercel environment variables and redeploy.",
  "check-email": "Check your email for the secure sign-in link.",
  "missing-email": "Enter a valid email address.",
  "signin-failed": "Could not send a sign-in link. Try again later.",
  "signup-failed": "Could not create an account link. Try again later."
};

export default function AuthFormMessage() {
  const searchParams = useSearchParams();
  const message = messages[searchParams.get("message") ?? ""];

  if (!message) {
    return null;
  }

  return (
    <p className="mt-4 border-2 border-ink bg-white p-3 text-sm font-bold leading-5 text-ink">
      {message}
    </p>
  );
}
