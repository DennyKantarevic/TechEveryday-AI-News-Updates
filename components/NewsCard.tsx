"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Bookmark, Check, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { CATEGORY_BY_ID } from "@/config/categories";
import {
  trackArticleOpened,
  trackArticleSaved,
  trackArticleViewed,
  trackGallerySaved
} from "@/lib/interactions";
import { placeholderImageForCategory } from "@/lib/placeholders";
import type { NewsItem } from "@/types/news";

const cardEntranceVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 26
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] }
  }
};

function formatPublishedDate(value: string) {
  const publishedAt = new Date(value);

  if (Number.isNaN(publishedAt.getTime())) {
    return "Invalid Date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York"
  }).format(publishedAt);
}

function sourceLabel(type: NewsItem["sourceType"]) {
  if (type === "x") {
    return "X post";
  }

  if (type === "paper") {
    return "Primary paper";
  }

  if (type === "official") {
    return "Official source";
  }

  return "Trusted source";
}

export default function NewsCard({
  item,
  mode = "newsletter",
  onRemove,
  staggeredEntrance = false
}: {
  item: NewsItem;
  mode?: "newsletter" | "gallery";
  onRemove?: (id: string) => Promise<void> | void;
  staggeredEntrance?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [saved, setSaved] = useState(item.saved);
  const [busy, setBusy] = useState(false);
  const fallbackImage = useMemo(
    () => placeholderImageForCategory(item.category, item.title),
    [item.category, item.title]
  );
  const [imageUrl, setImageUrl] = useState(
    item.imageUrl && !item.imageUrl.startsWith("placeholder:")
      ? item.imageUrl
      : fallbackImage
  );
  const publishedDate = useMemo(
    () => formatPublishedDate(item.publishedAt),
    [item.publishedAt]
  );
  const category = CATEGORY_BY_ID[item.category];

  useEffect(() => {
    trackArticleViewed(item);
  }, [item]);

  async function saveItem() {
    setBusy(true);
    try {
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: { ...item, saved: true } })
      });

      if (response.ok) {
        setSaved(true);
        trackArticleSaved(item);
        trackGallerySaved(item);
      }
    } finally {
      setBusy(false);
    }
  }

  async function removeItem() {
    if (!onRemove) {
      return;
    }

    setBusy(true);
    try {
      await onRemove(item.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.article
      layout={!shouldReduceMotion}
      variants={cardEntranceVariants}
      initial={staggeredEntrance ? undefined : shouldReduceMotion ? false : "hidden"}
      whileInView={staggeredEntrance || shouldReduceMotion ? undefined : "visible"}
      viewport={staggeredEntrance || shouldReduceMotion ? undefined : { once: true, margin: "-80px" }}
      className="card-frame flex h-full flex-col overflow-hidden rounded-sm"
    >
      <div className="image-crosshatch relative aspect-[16/9] overflow-hidden border-b-2 border-ink">
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
          onError={() => setImageUrl(fallbackImage)}
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="border-2 border-ink bg-bone px-2 py-1 text-[11px] font-black uppercase">
            {category.title}
          </span>
          {item.sourceType === "x" ? (
            <span className="border-2 border-ink bg-ink px-2 py-1 text-[11px] font-black uppercase text-white">
              X post
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.12em] text-ink/70">
          <span>{item.sourceName}</span>
          <span>{publishedDate}</span>
        </div>
        <h3 className="mt-3 font-display text-2xl font-black leading-tight">
          {item.title}
        </h3>
        <p className="mt-3 flex-1 text-sm leading-6 text-ink/78">{item.summary}</p>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 border border-ink/30 bg-paper px-2 py-1 text-xs font-bold">
            <ShieldCheck size={14} strokeWidth={2.4} />
            {sourceLabel(item.sourceType)} - {Math.round(item.trustScore * 100)}%
          </span>
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="border border-ink/20 px-2 py-1 text-xs">
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackArticleOpened(item)}
            className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-ink bg-ink px-3 py-2 text-sm font-black text-white transition hover:bg-white hover:text-ink"
          >
            Original <ExternalLink size={16} strokeWidth={2.6} />
          </a>
          {mode === "gallery" ? (
            <button
              type="button"
              aria-label="Remove from gallery"
              onClick={removeItem}
              disabled={busy}
              className="inline-flex min-h-11 w-12 items-center justify-center border-2 border-ink bg-white transition hover:bg-clay hover:text-white disabled:opacity-60"
            >
              <Trash2 size={17} strokeWidth={2.6} />
            </button>
          ) : (
            <button
              type="button"
              aria-label={saved ? "Saved to gallery" : "Save to gallery"}
              onClick={saveItem}
              disabled={busy || saved}
              className="inline-flex min-h-11 w-12 items-center justify-center border-2 border-ink bg-white transition hover:bg-paper disabled:cursor-default disabled:bg-sage disabled:text-white disabled:opacity-100"
            >
              {saved ? <Check size={18} strokeWidth={3} /> : <Bookmark size={17} strokeWidth={2.6} />}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
