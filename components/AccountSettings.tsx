"use client";

import React, { FormEvent, useState } from "react";
import DeleteDataPanel from "@/components/DeleteDataPanel";
import EmailSubscriptionToggle from "@/components/EmailSubscriptionToggle";

type AccountProfile = {
  displayName: string;
  email: string;
};

type AccountPreferences = {
  emailSubscribed: boolean;
  personalizationEnabled: boolean;
};

export default function AccountSettings({
  profile,
  preferences
}: {
  profile: AccountProfile;
  preferences: AccountPreferences;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [personalizationEnabled, setPersonalizationEnabled] = useState(
    preferences.personalizationEnabled
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function savePreferences(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    try {
      const response = await fetch("/api/account/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, personalizationEnabled })
      });

      if (!response.ok) {
        throw new Error("Preferences update failed.");
      }

      setMessage("Account settings were saved.");
    } catch {
      setMessage("We could not save account settings right now.");
    } finally {
      setPending(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setMessage("");

    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "same-origin"
      });
      window.location.assign("/login");
    } catch {
      setMessage("We could not sign out right now.");
      setSigningOut(false);
    }
  }

  return (
    <section className="mt-8 grid gap-6">
      <div className="border-2 border-ink bg-white p-6 shadow-[6px_6px_0_#111]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
          Privacy-first account system
        </p>
        <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
          Account settings
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-ink/75 md:text-base">
          Your saved articles and preferences are private to your account. You can clear
          reading history or unsubscribe anytime.
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/75">
          We store your email for login/subscriptions, saved articles, preferences, and
          optional reading signals used for For You recommendations.
        </p>
      </div>

      <form
        onSubmit={savePreferences}
        className="border-2 border-ink bg-bone p-5 shadow-[4px_4px_0_#111]"
      >
        <div className="mb-4 border-2 border-ink bg-white p-3">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-clay">
            Email
          </p>
          <p className="mt-1 break-words text-sm font-black">{profile.email}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-xs font-black uppercase tracking-[0.16em]">
            Display name
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={profile.email}
              className="mt-2 h-12 w-full border-2 border-ink bg-white px-3 text-sm font-bold outline-none"
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 border-2 border-ink bg-white px-3 text-sm font-black">
            <input
              type="checkbox"
              checked={personalizationEnabled}
              onChange={(event) => setPersonalizationEnabled(event.target.checked)}
              className="h-5 w-5 accent-black"
            />
            Personalization enabled
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="mt-5 min-h-11 border-2 border-ink bg-ink px-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-ink disabled:cursor-wait disabled:opacity-60"
        >
          Save account settings
        </button>
        <button
          type="button"
          disabled={signingOut}
          onClick={signOut}
          className="ml-0 mt-3 min-h-11 border-2 border-ink bg-white px-4 text-sm font-black uppercase tracking-[0.12em] text-ink transition hover:bg-ink hover:text-white disabled:cursor-wait disabled:opacity-60 md:ml-3"
        >
          Sign out
        </button>
        {message ? <p className="mt-3 text-sm font-bold text-clay">{message}</p> : null}
      </form>

      <EmailSubscriptionToggle subscribed={preferences.emailSubscribed} />
      <DeleteDataPanel />
    </section>
  );
}
