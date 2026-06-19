const SECRET_VALUE_PATTERN =
  /((?:api[_-]?key|token|secret|authorization|password|bearer)[=:\s]+)([^\s&]+)/gi;

export function safeRefreshErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error || "Unknown refresh error.");
  return raw.replace(SECRET_VALUE_PATTERN, "$1[redacted]").slice(0, 240);
}
