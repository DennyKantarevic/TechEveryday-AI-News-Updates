"use client";

import React, { useState } from "react";

export default function EmailSubscriptionToggle({ subscribed }: { subscribed: boolean }) {
  const [isSubscribed, setIsSubscribed] = useState(subscribed);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function updateSubscription(nextValue: boolean) {
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscribed: nextValue })
      });

      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.message || body.error || "Subscription update failed.");
      }

      setIsSubscribed(nextValue);
      setMessage(body.message || "Daily email settings were updated.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not update email settings right now."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0_#111]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-black leading-none">
            Daily email updates
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Subscribe only after confirming by email. Every message includes unsubscribe.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => updateSubscription(!isSubscribed)}
          className="min-h-11 border-2 border-ink bg-ink px-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          {isSubscribed ? "Unsubscribe" : "Subscribe"}
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-clay">{message}</p> : null}
    </section>
  );
}
