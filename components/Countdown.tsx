"use client";

import React from "react";
import { motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { formatCountdown, getNextRefreshAt } from "@/lib/time";

const COUNTDOWN_PLACEHOLDER = "--h --m --s";
const LAST_REFRESH_PLACEHOLDER = "loading";

export default function Countdown({
  lastRefreshAt
}: {
  lastRefreshAt?: string | null;
}) {
  const [countdownText, setCountdownText] = useState(COUNTDOWN_PLACEHOLDER);
  const [lastRefreshText, setLastRefreshText] = useState(LAST_REFRESH_PLACEHOLDER);

  useEffect(() => {
    function updateCountdown() {
      const current = new Date();
      const next = getNextRefreshAt(current);
      setCountdownText(formatCountdown(next.getTime() - current.getTime()));
    }

    setLastRefreshText(
      lastRefreshAt ? new Date(lastRefreshAt).toLocaleString() : "not yet run"
    );
    updateCountdown();

    const id = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(id);
  }, [lastRefreshAt]);

  return (
    <motion.aside
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45 }}
      className="border-2 border-ink bg-white p-5 shadow-[6px_6px_0_#111]"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center border-2 border-ink bg-paper">
          <Clock size={20} strokeWidth={2.5} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em]">Next refresh</p>
          <p className="mt-1 font-mono text-2xl font-black tabular-nums">
            {countdownText}
          </p>
        </div>
      </div>
      <p className="mt-4 border-t border-ink/20 pt-3 text-xs leading-5 text-ink/70">
        {`Runs at 7:00 AM America/New_York. Last refresh: ${lastRefreshText}.`}
      </p>
    </motion.aside>
  );
}
