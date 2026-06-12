import React from "react";
import { ArrowUpRight, BookOpenCheck } from "lucide-react";
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

            <div className="mt-6 border-t-2 border-ink pt-4">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brass">
                Foundational resources
              </p>
              <div className="mt-3 space-y-3">
                {foundation.resources.map((resource) => {
                  const body = (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-ink/62">
                        <span>{resource.author}</span>
                        {resource.year ? <span>{resource.year}</span> : null}
                        <span className="border border-ink/25 bg-paper px-2 py-0.5 text-ink">
                          {resource.tag}
                        </span>
                      </div>
                      <h4 className="mt-2 font-display text-xl font-black leading-tight">
                        {resource.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-ink/76">
                        {resource.whyItMatters}
                      </p>
                    </>
                  );

                  return resource.url ? (
                    <a
                      key={resource.title}
                      href={resource.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block border border-ink/25 bg-bone p-3 transition hover:-translate-y-0.5 hover:border-ink hover:shadow-[3px_3px_0_#111]"
                    >
                      {body}
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.12em]">
                        Open resource <ArrowUpRight size={14} strokeWidth={2.7} />
                      </span>
                    </a>
                  ) : (
                    <div
                      key={resource.title}
                      className="border border-ink/25 bg-bone p-3"
                    >
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
