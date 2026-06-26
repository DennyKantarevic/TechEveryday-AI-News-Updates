import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Calendar page source", () => {
  it("uses the human Calendar description copy", () => {
    const source = readFileSync(join(process.cwd(), "app/calendar/page.tsx"), "utf8");

    expect(source).toContain(
      "Pick a day and revisit the stories TechEveryday saved for you."
    );
    expect(source).not.toContain(
      "Browse the exact educational articles selected during each successful TechEveryday refresh."
    );
  });

  it("loads dated snapshots without applying the current-feed freshness filter", () => {
    const source = readFileSync(join(process.cwd(), "app/calendar/page.tsx"), "utf8");

    expect(source).toContain("listArchiveSnapshots");
    expect(source).toContain("readArchiveSnapshot");
    expect(source).not.toContain("filterFreshNewsItems");
  });
});
