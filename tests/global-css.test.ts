import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("global layout CSS", () => {
  it("prevents page transition animations from creating horizontal scroll", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");

    expect(css).toMatch(/html,\s*body\s*{[^}]*overflow-x:\s*hidden/s);
  });
});
