import { describe, expect, it } from "vitest";
import { readEmailConfig, safeEmailConfigDiagnostics } from "@/lib/email/config";

const productionUrl = "https://tech-everyday-ai-news-updates.vercel.app";
const sender = "TechEveryday <updates@techeveryday.org>";

describe("email environment configuration", () => {
  it("returns a safe error when RESEND_API_KEY is missing", () => {
    const result = readEmailConfig({
      EMAIL_FROM: sender,
      APP_BASE_URL: productionUrl
    });

    expect(result).toEqual({
      ok: false,
      error: "Missing RESEND_API_KEY. Add it to Vercel Production environment variables."
    });
  });

  it("returns a safe error when EMAIL_FROM is missing", () => {
    const result = readEmailConfig({
      RESEND_API_KEY: "test_resend_key",
      APP_BASE_URL: productionUrl
    });

    expect(result).toEqual({
      ok: false,
      error: "Missing EMAIL_FROM. Set EMAIL_FROM to TechEveryday <updates@techeveryday.org>."
    });
  });

  it("returns a safe error when APP_BASE_URL is missing", () => {
    const result = readEmailConfig({
      RESEND_API_KEY: "test_resend_key",
      EMAIL_FROM: sender
    });

    expect(result).toEqual({
      ok: false,
      error:
        "Missing APP_BASE_URL. Set APP_BASE_URL to https://tech-everyday-ai-news-updates.vercel.app."
    });
  });

  it("normalizes a complete production email config", () => {
    const result = readEmailConfig({
      RESEND_API_KEY: "test_resend_key",
      EMAIL_FROM: ` ${sender} `,
      APP_BASE_URL: `${productionUrl}/`
    });

    expect(result).toEqual({
      ok: true,
      config: {
        resendApiKey: "test_resend_key",
        emailFrom: sender,
        appBaseUrl: productionUrl
      }
    });
  });

  it("exposes only safe diagnostics", () => {
    const result = safeEmailConfigDiagnostics({
      RESEND_API_KEY: "test_resend_key",
      EMAIL_FROM: sender,
      APP_BASE_URL: productionUrl
    });

    expect(result).toEqual({
      hasResendApiKey: true,
      emailFrom: sender,
      hasAppBaseUrl: true,
      appBaseUrl: productionUrl
    });
    expect(JSON.stringify(result)).not.toContain("test_resend_key");
  });
});
