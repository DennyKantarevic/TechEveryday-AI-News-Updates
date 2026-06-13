import React from "react";
import { ArrowUpRight, Newspaper } from "lucide-react";
import { RelativeTime } from "@/components/RelativeTime";
import { CATEGORY_BY_ID } from "@/config/categories";
import type { NewsItem } from "@/types/news";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export default function LearningCurrentContext({ items }: { items: NewsItem[] }) {
  return (
    <section aria-labelledby="learning-current-title" className="scroll-mt-24">
      <div className="mb-6 flex flex-col gap-3 border-b-2 border-ink pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-brass">
            From today's feed
          </p>
          <h2
            id="learning-current-title"
            className="mt-2 font-display text-4xl font-black leading-none md:text-6xl"
          >
            Current Context
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-6 text-ink/75">
          A small set of recent stories connected to the foundations above.
        </p>
      </div>

      {items.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item.id} className="card-frame rounded-sm bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <span className="border-2 border-ink bg-bone px-2 py-1 text-[11px] font-black uppercase">
                  {CATEGORY_BY_ID[item.category].title}
                </span>
                <Newspaper size={19} strokeWidth={2.6} aria-hidden="true" />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/62">
                <span>{item.sourceName}</span>
                <span>{formatDate(item.publishedAt)}</span>
                <RelativeTime date={item.publishedAt} />
              </div>
              <h3 className="mt-3 font-display text-2xl font-black leading-tight">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-ink/78">{item.summary}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open article: ${item.title}`}
                className="mt-5 inline-flex min-h-10 items-center gap-2 border-2 border-ink bg-ink px-3 py-2 text-sm font-black text-white transition hover:bg-white hover:text-ink"
              >
                Original <ArrowUpRight size={16} strokeWidth={2.7} />
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="border-2 border-dashed border-ink bg-bone p-8 text-center">
          <h3 className="font-display text-2xl font-black">
            No matching learning stories in the current feed.
          </h3>
        </div>
      )}
    </section>
  );
}
