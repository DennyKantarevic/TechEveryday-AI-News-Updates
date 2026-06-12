import React from "react";
import { ArrowUpRight, Link2 } from "lucide-react";
import type { LearningBridge } from "@/lib/learning";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export default function LearningBridgeList({ bridges }: { bridges: LearningBridge[] }) {
  return (
    <section aria-labelledby="learning-bridge-title" className="scroll-mt-24">
      <div className="mb-6 border-b-2 border-ink pb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
          Make the connection
        </p>
        <h2
          id="learning-bridge-title"
          className="mt-2 font-display text-4xl font-black leading-none md:text-6xl"
        >
          Bridge to Current News
        </h2>
      </div>

      <div className="border-2 border-ink bg-white shadow-editorial">
        {bridges.map(({ foundation, story }, index) => (
          <article
            key={foundation.id}
            className={`grid gap-4 p-5 md:grid-cols-[0.8fr_1.2fr] md:items-start ${
              index === bridges.length - 1 ? "" : "border-b-2 border-ink"
            }`}
          >
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brass">
                {foundation.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-ink/78">{foundation.bridge}</p>
            </div>

            {story ? (
              <div className="bg-bone p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-ink/62">
                  <span>{story.sourceName}</span>
                  <span>{formatDate(story.publishedAt)}</span>
                </div>
                <h3 className="mt-2 font-display text-2xl font-black leading-tight">
                  {story.title}
                </h3>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Read current story: ${story.title}`}
                  className="mt-4 inline-flex min-h-10 items-center gap-2 border-2 border-ink bg-ink px-3 py-2 text-sm font-black text-white transition hover:bg-white hover:text-ink"
                >
                  Read current story <ArrowUpRight size={16} strokeWidth={2.7} />
                </a>
              </div>
            ) : (
              <div className="flex min-h-24 items-center gap-3 border-2 border-dashed border-ink bg-bone p-4 text-sm font-bold text-ink/70">
                <Link2 size={18} strokeWidth={2.6} aria-hidden="true" />
                No matching story in today's feed yet.
              </div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
