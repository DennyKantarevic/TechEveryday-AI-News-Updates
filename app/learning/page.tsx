import type { Metadata } from "next";
import LearningBridgeList from "@/components/LearningBridgeList";
import LearningCurrentContext from "@/components/LearningCurrentContext";
import LearningFoundations from "@/components/LearningFoundations";
import StickyHeader from "@/components/StickyHeader";
import {
  LEARNING_FOUNDATIONS,
  getLearningBridges,
  getLearningCurrentContext
} from "@/lib/learning";
import { fileStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Learning - TechEveryday",
  description:
    "Concise technology foundations that connect AI, systems, security, cloud, and research basics to the current TechEveryday feed."
};

export default async function LearningPage() {
  const dailyNews = await fileStorage.readDailyNews();
  const bridges = getLearningBridges(dailyNews);
  const currentContext = getLearningCurrentContext(dailyNews, 6);

  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <section className="border-b-2 border-ink pb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
            Learning desk
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none md:text-7xl">
            Foundations for reading the news
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 md:text-base">
            A concise reference for the core ideas behind AI, agents, research,
            systems, embedded devices, security, and cloud infrastructure.
          </p>
        </section>

        <div className="mt-12 space-y-16">
          <LearningFoundations foundations={LEARNING_FOUNDATIONS} />
          <LearningBridgeList bridges={bridges} />
          <LearningCurrentContext items={currentContext} />
        </div>
      </main>
    </>
  );
}
