import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/get-user";
import { createResendClient, emailFromAddress } from "@/lib/email/resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { hashToken } from "@/lib/security/hash";
import { createSecureToken } from "@/lib/security/tokens";
import { appUrl } from "@/lib/url/appBaseUrl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const subscribeSchema = z.object({
  email: z.string().trim().email().optional(),
  subscribed: z.boolean().default(true)
});

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
  const parsed = subscribeSchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json(
      { message: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const subscriptionEmail = parsed.data.email ?? user?.email ?? "";
  const userId = user?.id ?? null;

  if (!subscriptionEmail) {
    return NextResponse.json(
      { message: "Enter a valid email address." },
      { status: 400 }
    );
  }

  if (!parsed.data.subscribed) {
    if (!supabase || !user) {
      return NextResponse.json({ message: "Sign in to update account email settings." }, { status: 401 });
    }

    await supabase
      .from("newsletter_subscriptions")
      .update({ subscribed: false, unsubscribed_at: new Date().toISOString() })
      .eq("user_id", user.id);
    await supabase
      .from("user_preferences")
      .update({ email_subscribed: false })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      subscribed: false,
      message: "Daily email updates are turned off."
    });
  }

  const confirmationToken = createSecureToken();
  const unsubscribeToken = createSecureToken();
  const confirmationUrl = appUrl(`/api/email/confirm?token=${encodeURIComponent(
    confirmationToken
  )}`);

  try {
    const admin = createAdminSupabaseClient();
    const { error } = await admin.from("newsletter_subscriptions").upsert(
      {
        ...(userId ? { user_id: userId } : {}),
        email: subscriptionEmail,
        subscribed: false,
        confirmed_at: null,
        unsubscribed_at: null,
        confirmation_token_hash: hashToken(confirmationToken),
        unsubscribe_token_hash: hashToken(unsubscribeToken)
      },
      { onConflict: "email" }
    );

    if (error) {
      return NextResponse.json(
        { message: "Could not start email confirmation." },
        { status: 500 }
      );
    }

    if (supabase && user) {
      await supabase
        .from("user_preferences")
        .update({ email_subscribed: false })
        .eq("user_id", user.id);
    }

    const resend = createResendClient();
    const result = await resend.emails.send({
      from: emailFromAddress(),
      to: subscriptionEmail,
      subject: "Confirm TechEveryday daily updates",
      html: confirmationEmailHtml(confirmationUrl),
      text: `Confirm TechEveryday daily updates: ${confirmationUrl}`
    });

    if (result.error) {
      return NextResponse.json(
        { message: "Email provider rejected the confirmation email." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      confirmationRequired: true,
      message: "Check your email to confirm your TechEveryday subscription."
    });
  } catch {
    return NextResponse.json(
      { message: "Email confirmation is not configured yet." },
      { status: 503 }
    );
  }
}
