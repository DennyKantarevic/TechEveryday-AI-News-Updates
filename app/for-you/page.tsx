import ForYouFeed from "@/components/ForYouFeed";
import StickyHeader from "@/components/StickyHeader";
import { CATEGORY_IDS } from "@/config/categories";
import { LEARNING_FOUNDATIONS } from "@/lib/learning";
import { mergeSavedState } from "@/lib/news/refreshPipeline";
import { fileStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ForYouPage() {
  const [dailyNews, gallery] = await Promise.all([
    fileStorage.readDailyNews(),
    fileStorage.readGallery()
  ]);
  const articles = CATEGORY_IDS.flatMap((categoryId) =>
    mergeSavedState(dailyNews.categories[categoryId] ?? [], gallery)
  );

  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <section className="border-b-2 border-ink pb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
            Personal desk
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none md:text-7xl">
            For You
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 md:text-base">
            A local reading list shaped by saved topics, opened stories, category visits,
            and today&apos;s freshest trusted coverage.
          </p>
        </section>
        <ForYouFeed articles={articles} learningFoundations={LEARNING_FOUNDATIONS} />
      </main>
    </>
  );
}
