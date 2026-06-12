import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const clearSchema = z.object({
  target: z.enum(["history", "saved"]).default("history")
});

export async function POST(request: NextRequest) {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = clearSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid clear request." }, { status: 400 });
  }

  const table = parsed.data.target === "saved" ? "saved_articles" : "reading_events";
  const { error } = await supabase.from(table).delete().eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Could not clear account data." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
