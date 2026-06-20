export const PRODUCTION_APP_BASE_URL =
  "https://tech-everyday-ai-news-updates.vercel.app";

export function appBaseUrl() {
  const configured = process.env.APP_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.NODE_ENV === "development") {
    // Local development fallback only; production falls back to the Vercel URL.
    return "http://localhost:3000";
  }

  return PRODUCTION_APP_BASE_URL;
}

export function appUrl(path = "/") {
  return new URL(path, `${appBaseUrl()}/`).toString();
}
