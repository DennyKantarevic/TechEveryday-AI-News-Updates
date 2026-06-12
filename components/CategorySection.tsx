"use client";

import React, { useEffect } from "react";
import AnimatedArticleGrid from "@/components/AnimatedArticleGrid";
import AnimatedSectionHeader from "@/components/AnimatedSectionHeader";
import NewsCard from "@/components/NewsCard";
import { CATEGORIES } from "@/config/categories";
import { trackCategoryVisited } from "@/lib/interactions";
import type { NewsItem } from "@/types/news";

type Category = (typeof CATEGORIES)[number];

export default function CategorySection({
  category,
  items
}: {
  category: Category;
  items: NewsItem[];
}) {
  const categoryIndex = CATEGORIES.findIndex((current) => current.id === category.id);
  const entranceDirection = categoryIndex % 2 === 0 ? "left" : "right";

  useEffect(() => {
    if (items.length) {
      trackCategoryVisited(category.id);
    }
  }, [category.id, items.length]);

  if (!items.length) {
    return null;
  }

  return (
    <section className="scroll-mt-40 pt-4">
      <AnimatedSectionHeader
        direction={entranceDirection}
        className="mb-8 flex flex-col gap-5 border-b-2 border-ink pb-5 pt-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,34rem)] md:items-end md:gap-8"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase leading-5 tracking-[0.22em] text-brass">
            Curated desk
          </p>
          <h2 className="mt-4 max-w-5xl break-words font-display text-3xl font-black leading-[1.04] sm:text-4xl md:text-5xl xl:text-6xl">
            {category.title}
          </h2>
        </div>
        <p className="min-w-0 max-w-xl text-sm leading-6 text-ink/75 md:pb-1">
          {category.deck}
        </p>
      </AnimatedSectionHeader>
      <AnimatedArticleGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} staggeredEntrance />
        ))}
      </AnimatedArticleGrid>
    </section>
  );
}
