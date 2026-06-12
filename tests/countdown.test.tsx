import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import Countdown from "@/components/Countdown";

describe("Countdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders stable placeholder text before client effects calculate live values", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T10:00:00.000Z"));

    const html = renderToString(
      <Countdown
        initialNextRefreshAt="2026-06-11T11:00:00.000Z"
        lastRefreshAt="2026-06-10T11:00:00.000Z"
      />
    );

    expect(html).toContain("--h --m --s");
    expect(html).toContain("Last refresh: loading.");
    expect(html).not.toContain("01h 00m 00s");
    expect(html).not.toContain("6/10/2026");
  });
});
