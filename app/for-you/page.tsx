import ForYouFeed from "@/components/ForYouFeed";
import StickyHeader from "@/components/StickyHeader";
import { CATEGORY_IDS } from "@/config/categories";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  readingEventRowToInteractionEvent,
  type ReadingEventRow
} from "@/lib/events/readingEvents";
import {
  savedArticleRowToNewsItem,
  type SavedArticleRow
} from "@/lib/gallery/savedArticles";
import type { InteractionEvent } from "@/lib/interactions";
import { LEARNING_FOUNDATIONS } from "@/lib/learning";
import { filterFreshNewsItems } from "@/lib/news/freshness";
import { mergeSavedState } from "@/lib/news/refreshPipeline";
import { newsSnapshotStorage } from "@/lib/news/snapshotStorage";
import { fileStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ForYouPage() {
  const [dailyNews, fileGallery, { supabase, user }] = await Promise.all([
    newsSnapshotStorage.readDailyNews(),
    fileStorage.readGallery(),
    getCurrentUser()
  ]);
  let gallery = fileGallery;
  let initialEvents: InteractionEvent[] | undefined;
  let personalizationEnabled = true;

  if (supabase && user) {
    const [{ data: preferences }, { data: savedRows }] = await Promise.all([
      supabase
        .from("user_preferences")
        .select("personalization_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("saved_articles")
        .select("*")
        .eq("user_id", user.id)
        .order("saved_at", { ascending: false })
    ]);

    personalizationEnabled = preferences?.personalization_enabled ?? true;
    gallery = (savedRows ?? []).map((row) =>
      savedArticleRowToNewsItem(row as SavedArticleRow)
    );

    if (personalizationEnabled) {
      const { data: eventRows } = await supabase
        .from("reading_events")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(250);

      initialEvents = [
        ...(eventRows ?? []).map((row) =>
          readingEventRowToInteractionEvent(row as ReadingEventRow)
        ),
        ...gallery.map(
          (item): InteractionEvent => ({
            type: "gallery_saved",
            articleId: item.id,
            article: {
              id: item.id,
              title: item.title,
              summary: item.summary,
              url: item.url,
              sourceName: item.sourceName,
              sourceType: item.sourceType,
              category: item.category,
              publishedAt: item.publishedAt,
              foundAt: item.foundAt,
              tags: item.tags
            },
            category: item.category,
            sourceType: item.sourceType,
            createdAt: item.foundAt
          })
        )
      ];
    } else {
      initialEvents = [];
    }
  }

  const articles = CATEGORY_IDS.flatMap((categoryId) =>
    mergeSavedState(filterFreshNewsItems(dailyNews.categories[categoryId] ?? []), gallery)
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
        <ForYouFeed
          articles={articles}
          learningFoundations={LEARNING_FOUNDATIONS}
          initialEvents={initialEvents}
          personalizationEnabled={personalizationEnabled}
        />
      </main>
    </>
  );
}
