import React from "react";
import { BookOpenCheck } from "lucide-react";
import type { LearningFoundation } from "@/lib/learning";

export default function LearningFoundations({
  foundations
}: {
  foundations: readonly LearningFoundation[];
}) {
  return (
    <section aria-labelledby="learning-foundations-title" className="scroll-mt-24">
      <div className="mb-6 border-b-2 border-ink pb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-brass">
          Learning map
        </p>
        <h2
          id="learning-foundations-title"
          className="mt-2 font-display text-4xl font-black leading-none md:text-6xl"
        >
          Foundations
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {foundations.map((foundation) => (
          <article key={foundation.id} className="card-frame rounded-sm bg-white p-5">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-bone">
                <BookOpenCheck size={19} strokeWidth={2.6} aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-display text-2xl font-black leading-tight">
                  {foundation.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/72">{foundation.deck}</p>
              </div>
            </div>

            <ul className="mt-5 space-y-3 text-sm leading-6 text-ink/82">
              {foundation.points.map((point) => (
                <li key={point} className="border-l-4 border-clay pl-3">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
