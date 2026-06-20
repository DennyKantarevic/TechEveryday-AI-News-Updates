import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { interactionEventToReadingEventRow } from "@/lib/events/readingEvents";
import type { InteractionEvent } from "@/lib/interactions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const eventTypeSchema = z.enum([
  "article_viewed",
  "article_opened",
  "article_saved",
  "category_visited",
  "gallery_saved"
]);
const articleSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().default(""),
    summary: z.string().default(""),
    url: z.string().url().optional(),
    sourceName: z.string().default(""),
    sourceType: z.enum(["official", "news", "paper", "blog", "discovery", "x"]).optional(),
    category: z.string().optional(),
    publishedAt: z.string().optional(),
    foundAt: z.string().optional(),
    tags: z.array(z.string()).default([])
  })
  .passthrough();
const eventSchema = z.object({
  type: eventTypeSchema,
  articleId: z.string().min(1).optional(),
  article: articleSchema.optional(),
  category: z.string().optional(),
  sourceType: z.enum(["official", "news", "paper", "blog", "discovery", "x"]).optional(),
  createdAt: z.string().optional()
});

export async function POST(request: NextRequest) {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return new NextResponse(null, { status: 204 });
  }

  const parsed = eventSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  }

  const { data: preferences } = await supabase
    .from("user_preferences")
    .select("personalization_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (preferences?.personalization_enabled === false) {
    return new NextResponse(null, { status: 204 });
  }

  const event: InteractionEvent = {
    ...parsed.data,
    createdAt: parsed.data.createdAt ?? new Date().toISOString(),
    articleId: parsed.data.articleId ?? parsed.data.article?.id ?? parsed.data.category
  } as InteractionEvent;

  const { error } = await supabase
    .from("reading_events")
    .insert(interactionEventToReadingEventRow(user.id, event));

  if (error) {
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
