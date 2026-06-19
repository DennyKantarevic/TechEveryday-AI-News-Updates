import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccountSettings from "@/components/AccountSettings";

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
  );
});

describe("AccountSettings", () => {
  it("renders honest privacy copy and controls", () => {
    render(
      <AccountSettings
        profile={{ displayName: "Denny", email: "denny@example.com" }}
        preferences={{ emailSubscribed: false, personalizationEnabled: true }}
      />
    );

    expect(screen.getByText(/Privacy-first account system/i)).toBeInTheDocument();
    expect(
      screen.getByText(/We store your email for login\/subscriptions/i)
    ).toBeInTheDocument();
    expect(screen.getByText("denny@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear reading history/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear saved articles/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/i })).toBeInTheDocument();
  });

  it("can request clearing reading history", async () => {
    render(
      <AccountSettings
        profile={{ displayName: "", email: "denny@example.com" }}
        preferences={{ emailSubscribed: false, personalizationEnabled: true }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Clear reading history/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/account/clear-history",
        expect.objectContaining({ method: "POST" })
      )
    );
  });

  it("can sign out from account settings", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign },
      writable: true
    });
    render(
      <AccountSettings
        profile={{ displayName: "", email: "denny@example.com" }}
        preferences={{ emailSubscribed: false, personalizationEnabled: true }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        "/api/auth/signout",
        expect.objectContaining({ method: "POST" })
      )
    );
    expect(assign).toHaveBeenCalledWith("/login");
  });
});
