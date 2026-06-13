type EmailEnv = {
  [key: string]: string | undefined;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_BASE_URL?: string;
};

export type EmailConfig = {
  resendApiKey: string;
  emailFrom: string;
  appBaseUrl: string;
};

export type EmailConfigResult =
  | {
      ok: true;
      config: EmailConfig;
    }
  | {
      ok: false;
      error: string;
    };

export function readEmailConfig(env: EmailEnv = process.env): EmailConfigResult {
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim();
  const appBaseUrl = env.APP_BASE_URL?.trim().replace(/\/$/, "");

  if (!resendApiKey) {
    return {
      ok: false,
      error: "Missing RESEND_API_KEY. Add it to Vercel Production environment variables."
    };
  }

  if (!emailFrom) {
    return {
      ok: false,
      error: "Missing EMAIL_FROM. Set EMAIL_FROM to TechEveryday <updates@techeveryday.org>."
    };
  }

  if (!appBaseUrl) {
    return {
      ok: false,
      error:
        "Missing APP_BASE_URL. Set APP_BASE_URL to https://tech-everyday-ai-news-updates.vercel.app."
    };
  }

  return {
    ok: true,
    config: {
      resendApiKey,
      emailFrom,
      appBaseUrl
    }
  };
}

export function emailRouteUrl(config: EmailConfig, path: string) {
  return new URL(path, `${config.appBaseUrl}/`).toString();
}

export function safeEmailConfigDiagnostics(env: EmailEnv = process.env) {
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim() ?? null;
  const appBaseUrl = env.APP_BASE_URL?.trim().replace(/\/$/, "") ?? null;

  return {
    hasResendApiKey: Boolean(resendApiKey),
    emailFrom,
    hasAppBaseUrl: Boolean(appBaseUrl),
    appBaseUrl
  };
}
