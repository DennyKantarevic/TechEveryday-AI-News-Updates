"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { CATEGORIES } from "@/config/categories";
import NewsCard from "@/components/NewsCard";
import type { CategoryId } from "@/config/categories";
import type { NewsItem } from "@/types/news";

export default function GalleryGrid({ initialItems }: { initialItems: NewsItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");
  const [source, setSource] = useState("all");
  const sources = useMemo(
    () => Array.from(new Set(items.map((item) => item.sourceName))).sort(),
    [items]
  );
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.title, item.summary, item.sourceName, item.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesCategory = category === "all" || item.category === category;
      const matchesSource = source === "all" || item.sourceName === source;

      return matchesQuery && matchesCategory && matchesSource;
    });
  }, [category, items, query, source]);

  async function removeItem(id: string) {
    const response = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    if (response.ok) {
      setItems((current) => current.filter((item) => item.id !== id));
    }
  }

  return (
    <section className="mt-8">
      <div className="grid gap-3 border-2 border-ink bg-white p-4 shadow-[6px_6px_0_#111] md:grid-cols-[1.2fr_0.8fr_0.8fr]">
        <label className="flex min-h-12 items-center gap-2 border-2 border-ink bg-bone px-3">
          <Search size={18} strokeWidth={2.5} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search saved items"
            className="w-full bg-transparent text-sm font-bold outline-none placeholder:text-ink/45"
          />
        </label>
        <label className="flex min-h-12 items-center gap-2 border-2 border-ink bg-bone px-3">
          <Filter size={18} strokeWidth={2.5} />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryId | "all")}
            className="w-full bg-transparent text-sm font-bold outline-none"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-2 border-2 border-ink bg-bone px-3">
          <Filter size={18} strokeWidth={2.5} />
          <select
            value={source}
            onChange={(event) => setSource(event.target.value)}
            className="w-full bg-transparent text-sm font-bold outline-none"
          >
            <option value="all">All sources</option>
            {sources.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length ? (
        <motion.div layout className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence>
            {filtered.map((item) => (
              <NewsCard key={item.id} item={item} mode="gallery" onRemove={removeItem} />
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="mt-8 border-2 border-dashed border-ink bg-bone p-10 text-center">
          <h2 className="font-display text-3xl font-black">No saved items match.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink/70">
            Save stories from the daily briefing or adjust the filters to widen the gallery.
          </p>
        </div>
      )}
    </section>
  );
}
