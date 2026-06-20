import { act, render, screen } from "@testing-library/react";
import React from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTime, RelativeTime } from "@/components/RelativeTime";

afterEach(() => {
  vi.useRealTimers();
});

describe("RelativeTime", () => {
  it("formats concise article age labels", () => {
    const now = new Date("2026-06-13T12:00:00.000Z");

    expect(formatRelativeTime("2026-06-13T11:59:45.000Z", now)).toBe("Just now");
    expect(formatRelativeTime("2026-06-13T11:56:00.000Z", now)).toBe("4m ago");
    expect(formatRelativeTime("2026-06-13T10:00:00.000Z", now)).toBe("2h ago");
    expect(formatRelativeTime("2026-06-12T10:00:00.000Z", now)).toBe("1d ago");
    expect(formatRelativeTime("2026-06-10T10:00:00.000Z", now)).toBe("3d ago");
    expect(formatRelativeTime("not-a-date", now)).toBe("Recently");
  });

  it("renders a stable server placeholder before updating on the client interval", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-13T12:00:00.000Z"));

    expect(
      renderToString(<RelativeTime date="2026-06-13T11:59:30.000Z" />)
    ).toContain("Recently");

    render(<RelativeTime date="2026-06-13T11:59:30.000Z" />);

    act(() => {
      vi.advanceTimersByTime(0);
    });
    expect(screen.getByText("Just now")).toBeTruthy();

    act(() => {
      vi.setSystemTime(new Date("2026-06-13T12:01:30.000Z"));
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText("3m ago")).toBeTruthy();
  });
});
