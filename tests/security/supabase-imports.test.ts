import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const clientRoots = ["app", "components"];

function tsFiles(root: string): string[] {
  const absoluteRoot = join(process.cwd(), root);

  return readdirSync(absoluteRoot, { recursive: true })
    .map((entry) => join(absoluteRoot, String(entry)))
    .filter((path) => statSync(path).isFile())
    .filter((path) => /\.(ts|tsx)$/.test(path));
}

describe("Supabase service role isolation", () => {
  it("does not import the admin client from browser-facing files", () => {
    const files = clientRoots
      .flatMap(tsFiles)
      .filter((file) => !file.includes("/app/api/"))
      .filter((file) => file.includes("/components/") || readFileSync(file, "utf8").includes('"use client"'));
    const offenders = files.filter((file) =>
      readFileSync(file, "utf8").includes("@/lib/supabase/admin")
    );

    expect(offenders).toEqual([]);
  });
});
