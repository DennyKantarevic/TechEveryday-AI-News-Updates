"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, Compass, Newspaper, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import NewsCard from "@/components/NewsCard";
import { CATEGORY_BY_ID } from "@/config/categories";
import { readInteractionEvents } from "@/lib/interactions";
import {
  getFoundationalLearningRecommendations,
  getRecommendations,
  hasEnoughInteractionData
} from "@/lib/recommendations";
import type { InteractionEvent } from "@/lib/interactions";
import type {
  FoundationalLearningItem,
  FoundationalLearningRecommendation
} from "@/lib/recommendations";
import type { NewsItem } from "@/types/news";

function OnboardingState() {
  return (
    <section className="mt-10 border-2 border-dashed border-ink bg-bone p-8 shadow-[6px_6px_0_#111] md:p-10">
      <div className="max-w-2xl">
        <div className="inline-flex h-12 w-12 items-center justify-center border-2 border-ink bg-white">
          <Compass size={22} strokeWidth={2.6} />
        </div>
        <h2 className="mt-5 font-display text-4xl font-black leading-none md:text-5xl">
          Build a reading signal
        </h2>
        <p className="mt-4 text-sm leading-6 text-ink/75 md:text-base">
          For You starts after one save or a couple of article and category interactions.
        </p>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-ink bg-ink px-4 py-2 text-sm font-black text-white transition hover:bg-white hover:text-ink"
        >
          <Newspaper size={17} strokeWidth={2.6} />
          Daily briefing
        </Link>
        <Link
          href="/gallery"
          className="inline-flex min-h-11 items-center justify-center gap-2 border-2 border-ink bg-white px-4 py-2 text-sm font-black transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]"
        >
          <Bookmark size={17} strokeWidth={2.6} />
          Saved reading
        </Link>
      </div>
    </section>
  );
}

function EmptyRecommendations() {
  return (
    <section className="mt-10 border-2 border-ink bg-white p-8 shadow-[6px_6px_0_#111] md:p-10">
      <div className="inline-flex h-12 w-12 items-center justify-center border-2 border-ink bg-bone">
        <Sparkles size={21} strokeWidth={2.6} />
      </div>
      <h2 className="mt-5 font-display text-4xl font-black leading-none md:text-5xl">
        No strong matches yet
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/75 md:text-base">
        Your saved and opened topics do not overlap with today&apos;s feed enough to make a
        useful list.
      </p>
    </section>
  );
}

function LearningFallback({
  recommendations
}: {
  recommendations: FoundationalLearningRecommendation[];
}) {
  if (!recommendations.length) {
    return null;
  }

  return (
    <section className="mt-12 border-t-2 border-ink pt-8">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-brass">
          Foundations
        </p>
        <h2 className="mt-2 font-display text-3xl font-black leading-none md:text-5xl">
          Useful background
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {recommendations.map((recommendation) => (
          <article
            key={recommendation.item.id}
            className="border-2 border-ink bg-white p-5 shadow-[4px_4px_0_#111]"
          >
            <p className="text-xs font-bold leading-5 text-clay">{recommendation.reason}</p>
            <h3 className="mt-3 font-display text-2xl font-black leading-tight">
              {recommendation.item.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-ink/75">{recommendation.item.deck}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function ForYouFeed({
  articles,
  learningFoundations = []
}: {
  articles: NewsItem[];
  learningFoundations?: readonly FoundationalLearningItem[];
}) {
  const [events, setEvents] = useState<InteractionEvent[]>([]);

  useEffect(() => {
    setEvents(readInteractionEvents());
  }, []);

  const enoughSignals = hasEnoughInteractionData(events);
  const recommendations = useMemo(
    () => getRecommendations({ articles, events, limit: 12 }),
    [articles, events]
  );
  const learningRecommendations = useMemo(
    () =>
      getFoundationalLearningRecommendations({
        foundations: learningFoundations,
        events,
        limit: 3
      }),
    [events, learningFoundations]
  );
  const showLearningFallbacks =
    learningRecommendations.length > 0 && recommendations.length < 6;
  const categoryLabels = useMemo(() => {
    const categories = new Set(recommendations.map((recommendation) => recommendation.item.category));
    return Array.from(categories)
      .flatMap((category) => {
        const title = CATEGORY_BY_ID[category]?.title;
        return title ? [title] : [];
      })
      .slice(0, 4);
  }, [recommendations]);

  if (!enoughSignals) {
    return <OnboardingState />;
  }

  if (!recommendations.length) {
    return showLearningFallbacks ? (
      <LearningFallback recommendations={learningRecommendations} />
    ) : (
      <EmptyRecommendations />
    );
  }

  return (
    <section className="mt-10">
      <div className="mb-6 grid gap-4 border-b-2 border-ink pb-5 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brass">
            Matched today
          </p>
          <h2 className="mt-2 font-display text-4xl font-black leading-none md:text-6xl">
            Recommended reading
          </h2>
        </div>
        {categoryLabels.length ? (
          <div className="flex max-w-xl flex-wrap gap-2 md:justify-end">
            {categoryLabels.map((label) => (
              <span
                key={label}
                className="border border-ink/25 bg-bone px-2 py-1 text-xs font-bold"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <motion.div layout className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((recommendation) => (
          <div key={recommendation.item.id} className="flex min-w-0 flex-col gap-3">
            <div className="border-2 border-ink bg-bone px-3 py-2 text-xs font-bold leading-5 shadow-[3px_3px_0_#111]">
              {recommendation.reason}
            </div>
            <NewsCard item={recommendation.item} />
          </div>
        ))}
      </motion.div>
      {showLearningFallbacks ? (
        <LearningFallback recommendations={learningRecommendations} />
      ) : null}
    </section>
  );
}
