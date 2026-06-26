import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Calendar page source", () => {
  it("loads dated snapshots without applying the current-feed freshness filter", () => {
    const source = readFileSync(join(process.cwd(), "app/calendar/page.tsx"), "utf8");

    expect(source).toContain("listArchiveSnapshots");
    expect(source).toContain("readArchiveSnapshot");
    expect(source).not.toContain("filterFreshNewsItems");
  });
});
