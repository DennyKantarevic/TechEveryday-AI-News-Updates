"use client";

import React, { useState } from "react";

type ClearTarget = "history" | "saved";

export default function DeleteDataPanel() {
  const [message, setMessage] = useState("");
  const [pendingTarget, setPendingTarget] = useState<ClearTarget | null>(null);

  async function clearData(target: ClearTarget) {
    setPendingTarget(target);
    setMessage("");

    try {
      const response = await fetch("/api/account/clear-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target })
      });

      if (!response.ok) {
        throw new Error("Clear request failed.");
      }

      setMessage(
        target === "history"
          ? "Reading history was cleared."
          : "Saved articles were cleared."
      );
    } catch {
      setMessage("We could not clear that data right now.");
    } finally {
      setPendingTarget(null);
    }
  }

  return (
    <section className="border-2 border-ink bg-bone p-5 shadow-[4px_4px_0_#111]">
      <h2 className="font-display text-3xl font-black leading-none">Data controls</h2>
      <p className="mt-2 text-sm leading-6 text-ink/70">
        You can clear reading signals or remove saved articles from your account.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pendingTarget === "history"}
          onClick={() => clearData("history")}
          className="min-h-11 border-2 border-ink bg-white px-4 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] disabled:cursor-wait disabled:opacity-60"
        >
          Clear reading history
        </button>
        <button
          type="button"
          disabled={pendingTarget === "saved"}
          onClick={() => clearData("saved")}
          className="min-h-11 border-2 border-ink bg-white px-4 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] disabled:cursor-wait disabled:opacity-60"
        >
          Clear saved articles
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-bold text-clay">{message}</p> : null}
    </section>
  );
}
