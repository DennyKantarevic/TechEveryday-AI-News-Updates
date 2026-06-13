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
      error: "Email service is not configured: missing RESEND_API_KEY."
    };
  }

  if (!emailFrom) {
    return {
      ok: false,
      error: "Email sender is not configured: missing EMAIL_FROM."
    };
  }

  if (!appBaseUrl) {
    return {
      ok: false,
      error: "App base URL is not configured: missing APP_BASE_URL."
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
