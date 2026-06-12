"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import React, { useEffect } from "react";
import NewsCard from "@/components/NewsCard";
import { CATEGORIES } from "@/config/categories";
import { trackCategoryVisited } from "@/lib/interactions";
import type { NewsItem } from "@/types/news";

type Category = (typeof CATEGORIES)[number];

const headerVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 56
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.48, ease: [0.22, 1, 0.36, 1] }
  }
};

const cardGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.48,
      staggerChildren: 0.08
    }
  }
};

export default function CategorySection({
  category,
  items
}: {
  category: Category;
  items: NewsItem[];
}) {
  const shouldReduceMotion = useReducedMotion();
  const categoryIndex = CATEGORIES.findIndex((current) => current.id === category.id);
  const entranceDirection = categoryIndex % 2 === 0 ? -1 : 1;

  useEffect(() => {
    if (items.length) {
      trackCategoryVisited(category.id);
    }
  }, [category.id, items.length]);

  if (!items.length) {
    return null;
  }

  return (
    <motion.section
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: true, margin: "-110px" }}
      className="scroll-mt-28"
    >
      <motion.div
        custom={entranceDirection}
        variants={headerVariants}
        className="mb-7 flex flex-col gap-5 border-b-2 border-ink pb-5 md:flex-row md:items-end md:justify-between md:gap-8"
      >
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brass">
            Curated desk
          </p>
          <h2 className="mt-2 break-words font-display text-4xl font-black leading-[0.98] md:text-6xl">
            {category.title}
          </h2>
        </div>
        <p className="min-w-0 max-w-xl text-sm leading-6 text-ink/75 md:flex-[0_1_34rem] md:pb-1">
          {category.deck}
        </p>
      </motion.div>
      <motion.div variants={cardGridVariants} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} staggeredEntrance />
        ))}
      </motion.div>
    </motion.section>
  );
}
