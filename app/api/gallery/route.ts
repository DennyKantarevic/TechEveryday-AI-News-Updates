import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import {
  newsItemToSavedArticleRow,
  savedArticleRowToNewsItem,
  type SavedArticleRow
} from "@/lib/gallery/savedArticles";
import { fileStorage } from "@/lib/storage";
import type { NewsItem } from "@/types/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sourceTypeSchema = z.enum(["official", "news", "paper", "blog", "discovery", "x"]);
const newsItemSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    summary: z.string().default(""),
    url: z.string().url(),
    canonicalUrl: z.string().url().optional(),
    sourceName: z.string().default("Saved source"),
    sourceType: sourceTypeSchema.default("news"),
    category: z.string().min(1),
    publishedAt: z.string().optional(),
    foundAt: z.string().optional(),
    imageUrl: z.string().optional(),
    trustScore: z.number().optional(),
    freshnessScore: z.number().optional(),
    technicalDepthScore: z.number().optional(),
    educationalScore: z.number().optional(),
    practicalUsefulnessScore: z.number().optional(),
    noveltyScore: z.number().optional(),
    finalScore: z.number().optional(),
    saved: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    keyClaims: z.array(z.string()).optional(),
    whyItMatters: z.string().optional()
  })
  .passthrough();
const saveSchema = z.object({ item: newsItemSchema });

function parsedItemToNewsItem(item: z.infer<typeof newsItemSchema>): NewsItem {
  const now = new Date().toISOString();

  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    url: item.url,
    canonicalUrl: item.canonicalUrl ?? item.url,
    sourceName: item.sourceName,
    sourceType: item.sourceType,
    category: item.category as NewsItem["category"],
    publishedAt: item.publishedAt ?? now,
    foundAt: item.foundAt ?? now,
    imageUrl: item.imageUrl,
    trustScore: item.trustScore ?? 0.8,
    freshnessScore: item.freshnessScore ?? 0,
    technicalDepthScore: item.technicalDepthScore ?? 0,
    educationalScore: item.educationalScore ?? 0,
    practicalUsefulnessScore: item.practicalUsefulnessScore ?? 0,
    noveltyScore: item.noveltyScore ?? 0,
    finalScore: item.finalScore ?? 0,
    saved: true,
    tags: item.tags ?? [],
    keyClaims: item.keyClaims ?? [],
    whyItMatters: item.whyItMatters ?? item.summary ?? "Saved for later reading."
  };
}

async function readAccountGallery() {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from("saved_articles")
    .select("*")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => savedArticleRowToNewsItem(row as SavedArticleRow));
}

export async function GET() {
  const accountGallery = await readAccountGallery();

  if (accountGallery) {
    return NextResponse.json({ items: accountGallery });
  }

  const gallery = await fileStorage.readGallery();
  return NextResponse.json({ items: gallery });
}

export async function POST(request: NextRequest) {
  const parsed = saveSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "A valid item is required." }, { status: 400 });
  }

  const item = parsedItemToNewsItem(parsed.data.item);
  const { supabase, user } = await getCurrentUser();

  if (supabase && user) {
    const { data, error } = await supabase
      .from("saved_articles")
      .upsert(newsItemToSavedArticleRow(user.id, item), {
        onConflict: "user_id,article_id"
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: "Could not save article." }, { status: 500 });
    }

    return NextResponse.json({
      item: savedArticleRowToNewsItem(data as SavedArticleRow)
    });
  }

  const savedItem = await fileStorage.saveGalleryItem(item);
  return NextResponse.json({ item: savedItem });
}

export async function DELETE(request: NextRequest) {
  let id = request.nextUrl.searchParams.get("id");

  if (!id) {
    try {
      const body = (await request.json()) as { id?: string };
      id = body.id ?? null;
    } catch {
      id = null;
    }
  }

  if (!id) {
    return NextResponse.json({ error: "An item id is required." }, { status: 400 });
  }

  const { supabase, user } = await getCurrentUser();

  if (supabase && user) {
    const { error } = await supabase
      .from("saved_articles")
      .delete()
      .eq("user_id", user.id)
      .eq("article_id", id);

    if (error) {
      return NextResponse.json({ error: "Could not remove article." }, { status: 500 });
    }

    return NextResponse.json({ items: await readAccountGallery() });
  }

  const items = await fileStorage.removeGalleryItem(id);
  return NextResponse.json({ items });
}
