type EmailEnv = {
  [key: string]: string | undefined;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  APP_BASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
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

function safeProviderText(value: unknown) {
  return String(value ?? "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]")
    .replace(/re_[A-Za-z0-9_-]+/g, "[resend_key]")
    .slice(0, 300);
}

export function safeEmailProviderErrorMessage(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? safeProviderText(error.message)
      : safeProviderText(error);

  if (/domain.*not.*verif|verify.*domain|domain.*verify|not verified/i.test(message)) {
    return "Email domain is not verified in Resend.";
  }

  if (/rate.?limit|too many/i.test(message)) {
    return "Email provider rate limited this request.";
  }

  if (/api key|unauthorized|authentication|permission/i.test(message)) {
    return "Email provider authentication failed.";
  }

  return "Email provider rejected the email.";
}

export function safeEmailConfigDiagnostics(env: EmailEnv = process.env) {
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim() ?? null;
  const appBaseUrl = env.APP_BASE_URL?.trim().replace(/\/$/, "") ?? null;

  return {
    hasResendApiKey: Boolean(resendApiKey),
    hasSupabaseServiceRoleKey: Boolean(supabaseServiceRoleKey),
    emailFrom,
    hasAppBaseUrl: Boolean(appBaseUrl),
    appBaseUrl
  };
}
