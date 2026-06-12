"use client";

import { motion } from "framer-motion";
import NewsCard from "@/components/NewsCard";
import type { CATEGORIES } from "@/config/categories";
import type { NewsItem } from "@/types/news";

type Category = (typeof CATEGORIES)[number];

export default function CategorySection({
  category,
  items
}: {
  category: Category;
  items: NewsItem[];
}) {
  if (!items.length) {
    return null;
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-110px" }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="scroll-mt-24"
    >
      <div className="mb-6 flex flex-col gap-4 border-b-2 border-ink pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brass">
            Curated desk
          </p>
          <h2 className="mt-2 font-display text-4xl font-black leading-none md:text-6xl">
            {category.title}
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ink/75">{category.deck}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
      </div>
    </motion.section>
  );
}
