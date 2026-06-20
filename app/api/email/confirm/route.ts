import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/security/hash";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function htmlResponse(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html><body style="margin:0;background:#f3eadb;font-family:Arial,sans-serif;color:#111111;"><main style="max-width:640px;margin:48px auto;border:2px solid #111111;background:#fffdf8;padding:28px;"><p style="font-size:12px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#8a5d3b;">TechEveryday</p><h1 style="font-family:Georgia,serif;font-size:36px;line-height:1;margin:0 0 12px;">${title}</h1><p style="font-size:15px;line-height:1.6;">${body}</p><a href="/" style="display:inline-block;margin-top:8px;border:2px solid #111111;background:#111111;color:#ffffff;text-decoration:none;padding:10px 14px;font-size:13px;font-weight:800;">Open TechEveryday</a></main></body></html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" }
    }
  );
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return htmlResponse("Invalid link", "The confirmation link is missing a token.", 400);
  }

  const admin = createAdminSupabaseClient();
  const tokenHash = hashToken(token);
  const { data: subscription, error } = await admin
    .from("newsletter_subscriptions")
    .select("id,user_id")
    .eq("confirmation_token_hash", tokenHash)
    .maybeSingle();

  if (error || !subscription) {
    return htmlResponse("Invalid link", "This confirmation link is invalid or expired.", 404);
  }

  await admin
    .from("newsletter_subscriptions")
    .update({
      subscribed: true,
      confirmed_at: new Date().toISOString(),
      unsubscribed_at: null,
      confirmation_token_hash: null
    })
    .eq("id", subscription.id);

  if (subscription.user_id) {
    await admin
      .from("user_preferences")
      .update({ email_subscribed: true })
      .eq("user_id", subscription.user_id);
  }

  return htmlResponse(
    "Subscription confirmed",
    "Daily email updates are now enabled. You can unsubscribe anytime."
  );
}
