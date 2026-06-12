import { createHash } from "node:crypto";

export function createNewsId(url: string, title: string) {
  return createHash("sha1").update(`${url.trim().toLowerCase()}::${title.trim()}`).digest("hex");
}
