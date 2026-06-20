import GalleryGrid from "@/components/GalleryGrid";
import StickyHeader from "@/components/StickyHeader";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  savedArticleRowToNewsItem,
  type SavedArticleRow
} from "@/lib/gallery/savedArticles";
import { fileStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const { supabase, user } = await getCurrentUser();
  let gallery = await fileStorage.readGallery();

  if (supabase && user) {
    const { data } = await supabase
      .from("saved_articles")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    gallery = (data ?? []).map((row) => savedArticleRowToNewsItem(row as SavedArticleRow));
  }

  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <section className="border-b-2 border-ink pb-8">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
            Permanent gallery
          </p>
          <h1 className="mt-3 font-display text-5xl leading-none md:text-7xl">
            Saved reading
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 md:text-base">
            Items saved here remain available after the daily newsletter refreshes.
          </p>
        </section>
        <GalleryGrid initialItems={gallery} />
      </main>
    </>
  );
}
