"use client";

import React, { FormEvent, useState } from "react";

export default function NewsletterSignupForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/email/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subscribed: true })
      });
      const body = (await response.json().catch(() => ({}))) as { message?: string };

      if (!response.ok) {
        throw new Error(body.message || "Subscription failed.");
      }

      setEmail("");
      setMessage(body.message || "Check your email to confirm your TechEveryday subscription.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not start the email confirmation right now."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 border-2 border-ink bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-clay">
        Daily email updates
      </p>
      <p className="mt-2 text-sm leading-6 text-ink/70">
        Get the daily research brief after confirming your email. You can unsubscribe anytime.
      </p>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto]">
        <input
          required
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-12 border-2 border-ink bg-bone px-3 text-sm font-bold outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-12 border-2 border-ink bg-ink px-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          Confirm email
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-clay">{message}</p> : null}
    </form>
  );
}
