import { CATEGORIES } from "@/config/categories";
import CategorySection from "@/components/CategorySection";
import Countdown from "@/components/Countdown";
import BrandWordmark from "@/components/BrandWordmark";
import HeroTitle from "@/components/HeroTitle";
import StickyHeader from "@/components/StickyHeader";
import { filterFreshNewsItems } from "@/lib/news/freshness";
import { mergeSavedState } from "@/lib/news/refreshPipeline";
import { newsSnapshotStorage } from "@/lib/news/snapshotStorage";
import { fileStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function HomePage() {
  const [dailyNews, gallery, lastRefresh] = await Promise.all([
    newsSnapshotStorage.readDailyNews(),
    fileStorage.readGallery(),
    newsSnapshotStorage.readLastRefresh()
  ]);
  const now = new Date();
  return (
    <>
      <StickyHeader />
      <HeroTitle />
      <main className="pb-24">
        <section className="editorial-shell border-y-2 border-ink bg-bone px-5 py-6 shadow-editorial md:px-8">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
                Daily briefing
              </p>
              <h1 className="mt-2 font-display text-4xl leading-none md:text-6xl">
                <BrandWordmark /> <span>- AI News Updates</span>
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 md:text-base">
                Trusted technology news, research papers, and optional verified X posts
                refreshed for the 7:00 AM America/New_York reading window.
              </p>
            </div>
            <Countdown lastRefreshAt={lastRefresh.refreshedAt} />
          </div>
        </section>

        <div className="editorial-shell mt-20 space-y-16">
          {CATEGORIES.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              items={mergeSavedState(
                filterFreshNewsItems(dailyNews.categories[category.id] ?? [], now),
                gallery
              )}
            />
          ))}
        </div>
      </main>
    </>
  );
}
