import "server-only";
import { Resend } from "resend";

export function createResendClient(apiKey = process.env.RESEND_API_KEY) {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  return new Resend(apiKey);
}

export function emailFromAddress() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  return from;
}
