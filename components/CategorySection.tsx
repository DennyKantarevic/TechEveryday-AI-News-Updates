"use client";

import { motion, useInView, useReducedMotion, type Variants } from "framer-motion";
import React, { useEffect, useRef } from "react";
import AnimatedArticleGrid from "@/components/AnimatedArticleGrid";
import AnimatedSectionHeader from "@/components/AnimatedSectionHeader";
import NewsCard from "@/components/NewsCard";
import { CATEGORIES } from "@/config/categories";
import { trackCategoryVisited } from "@/lib/interactions";
import type { NewsItem } from "@/types/news";

type Category = (typeof CATEGORIES)[number];

const sectionVariants: Variants = {
  hidden: {},
  visible: {}
};

export default function CategorySection({
  category,
  items
}: {
  category: Category;
  items: NewsItem[];
}) {
  const categoryIndex = CATEGORIES.findIndex((current) => current.id === category.id);
  const entranceDirection = categoryIndex % 2 === 0 ? "left" : "right";
  const sectionRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isInView = useInView(sectionRef, {
    amount: "some",
    margin: "0px 0px -12% 0px"
  });
  const animationState = shouldReduceMotion || isInView ? "visible" : "hidden";

  useEffect(() => {
    if (items.length) {
      trackCategoryVisited(category.id);
    }
  }, [category.id, items.length]);

  return (
    <motion.section
      ref={sectionRef}
      variants={shouldReduceMotion ? undefined : sectionVariants}
      initial={shouldReduceMotion ? false : "hidden"}
      animate={animationState}
      data-testid={`category-section-${category.id}`}
      className="scroll-mt-40 pt-4"
    >
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
      {items.length ? (
        <AnimatedArticleGrid className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} staggeredEntrance />
          ))}
        </AnimatedArticleGrid>
      ) : (
        <div className="border-2 border-dashed border-ink bg-bone p-8 text-center shadow-[5px_5px_0_#111]">
          <p className="mx-auto max-w-md text-sm font-black uppercase leading-6 tracking-[0.12em] text-ink/70">
            No high-signal new items found in the last 72 hours.
          </p>
        </div>
      )}
    </motion.section>
  );
}
