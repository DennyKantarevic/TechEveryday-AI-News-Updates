"use client";

import { useSearchParams } from "next/navigation";

const messages: Record<string, string> = {
  "auth-unconfigured":
    "Account login is not configured in this deployment. Add the Supabase Vercel environment variables and redeploy.",
  "auth-callback-error": "The sign-in link could not be verified. Request a new link.",
  "auth-callback-missing": "This sign-in link is incomplete. Request a new link.",
  "check-email": "Check your email for the secure sign-in link.",
  "missing-email": "Enter a valid email address.",
  "signin-rate-limited": "Too many sign-in link requests. Wait a few minutes and try again.",
  "signin-invalid-redirect":
    "Sign-in is misconfigured: the email redirect URL is not allowed.",
  "signin-email-disabled": "Email sign-in is disabled in Supabase Auth.",
  "signin-email-send-failed":
    "Supabase could not send the sign-in email. Check SMTP or email provider settings.",
  "signin-invalid-email": "Enter a valid email address.",
  "signin-failed": "Could not send a sign-in link. Try again later.",
  "signup-rate-limited": "Too many signup link requests. Wait a few minutes and try again.",
  "signup-invalid-redirect":
    "Signup is misconfigured: the email redirect URL is not allowed.",
  "signup-email-disabled": "Email signup is disabled in Supabase Auth.",
  "signup-email-send-failed":
    "Supabase could not send the signup email. Check SMTP or email provider settings.",
  "signup-invalid-email": "Enter a valid email address.",
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
