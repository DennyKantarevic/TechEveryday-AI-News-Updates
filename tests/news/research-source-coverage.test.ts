import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TRUSTED_SOURCES } from "@/config/sources";

function source(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

describe("research source coverage", () => {
  it("queries the expected recent arXiv research categories", () => {
    const fetcher = source("lib/news/fetchArxiv.ts");

    for (const category of [
      "cs.AI",
      "cs.LG",
      "cs.CL",
      "cs.CV",
      "cs.RO",
      "cs.DC",
      "cs.OS",
      "cs.SE",
      "cs.SY",
      "stat.ML"
    ]) {
      expect(fetcher).toContain(`"cat:${category}"`);
    }
  });

  it("includes reliable requested lab, research, systems, and hardware sources", () => {
    const names = new Set(TRUSTED_SOURCES.map((trustedSource) => trustedSource.name));

    for (const name of [
      "Google DeepMind Blog",
      "Hugging Face Blog",
      "Berkeley AI Research Blog",
      "ACM Queue",
      "Vercel Blog",
      "Docker Blog",
      "Google Cloud Blog",
      "Microsoft Azure Blog",
      "ARM Community Blog",
      "Hackster.io",
      "NVIDIA Technical Blog"
    ]) {
      expect(names.has(name)).toBe(true);
    }
  });
});
