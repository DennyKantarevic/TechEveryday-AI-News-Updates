import { randomBytes } from "node:crypto";

export function createSecureToken() {
  return randomBytes(32).toString("base64url");
}
