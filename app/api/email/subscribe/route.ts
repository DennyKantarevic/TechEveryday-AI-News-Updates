import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createResendClient, emailFromAddress } from "@/lib/email/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/security/hash";
import { createSecureToken } from "@/lib/security/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  subscribed: z.boolean()
});

function appBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function confirmationEmailHtml(confirmUrl: string) {
  return `
    <div style="background:#f3eadb;padding:28px 16px;font-family:Arial,sans-serif;color:#111111;">
      <main style="max-width:620px;margin:0 auto;border:2px solid #111111;background:#fffdf8;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;font-weight:800;color:#8a5d3b;">Confirm subscription</p>
        <h1 style="margin:0;font-family:Georgia,serif;font-size:32px;line-height:1;">TechEveryday</h1>
        <p style="margin:14px 0;font-size:15px;line-height:1.6;">Confirm daily email updates before we send newsletter emails to this address.</p>
        <a href="${confirmUrl}" style="display:inline-block;border:2px solid #111111;background:#111111;color:#ffffff;text-decoration:none;padding:11px 15px;font-size:13px;font-weight:800;">Confirm daily updates</a>
      </main>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user?.email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const parsed = subscribeSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid subscription request." }, { status: 400 });
  }

  if (!parsed.data.subscribed) {
    await supabase
      .from("newsletter_subscriptions")
      .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await supabase
      .from("user_preferences")
      .update({ email_subscribed: false })
      .eq("user_id", user.id);

    return NextResponse.json({ ok: true, subscribed: false });
  }

  const confirmationToken = createSecureToken();
  const unsubscribeToken = createSecureToken();
  const confirmationUrl = `${appBaseUrl()}/api/email/confirm?token=${encodeURIComponent(
    confirmationToken
  )}`;
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("newsletter_subscriptions").upsert(
    {
      user_id: user.id,
      email: user.email,
      subscribed: false,
      confirmed_at: null,
      unsubscribed_at: null,
      confirmation_token_hash: hashToken(confirmationToken),
      unsubscribe_token_hash: hashToken(unsubscribeToken)
    },
    { onConflict: "email" }
  );

  if (error) {
    return NextResponse.json({ error: "Could not create subscription." }, { status: 500 });
  }

  const resend = createResendClient();

  await resend.emails.send({
    from: emailFromAddress(),
    to: user.email,
    subject: "Confirm TechEveryday daily updates",
    html: confirmationEmailHtml(confirmationUrl),
    text: `Confirm TechEveryday daily updates: ${confirmationUrl}`
  });

  return NextResponse.json({ ok: true, confirmationRequired: true });
}
