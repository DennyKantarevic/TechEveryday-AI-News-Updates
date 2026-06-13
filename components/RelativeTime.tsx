"use client";

import React from "react";
import { useEffect, useState } from "react";

export function formatRelativeTime(dateString: string, now = new Date()) {
  const published = new Date(dateString).getTime();

  if (Number.isNaN(published)) {
    return "Recently";
  }

  const diffMs = now.getTime() - published;
  const diffSeconds = Math.max(0, Math.floor(diffMs / 1000));
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "Just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${diffDays}d ago`;
}

export function RelativeTime({ date }: { date: string }) {
  const [label, setLabel] = useState("Recently");

  useEffect(() => {
    const update = () => setLabel(formatRelativeTime(date));

    update();
    const interval = window.setInterval(update, 60_000);

    return () => window.clearInterval(interval);
  }, [date]);

  return <span className="inline-block min-w-[4.5rem] tabular-nums">{label}</span>;
}
