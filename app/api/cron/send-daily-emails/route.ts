import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_BY_ID, CATEGORY_IDS } from "@/config/categories";
import { createResendClient, emailFromAddress } from "@/lib/email/resend";
import {
  renderDailyNewsletterEmail,
  type DailyNewsletterEmailItem
} from "@/lib/email/templates/dailyNewsletter";
import { hashToken } from "@/lib/security/hash";
import { createSecureToken } from "@/lib/security/tokens";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { fileStorage } from "@/lib/storage";
import { getZonedParts, REFRESH_TIME_ZONE, zonedTimeToUtc } from "@/lib/time";
import type { NewsItem } from "@/types/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionRow = {
  id: string;
  user_id: string | null;
  email: string;
};

function appBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const querySecret = request.nextUrl.searchParams.get("secret");

  return Boolean(cronSecret && (bearer === cronSecret || querySecret === cronSecret));
}

function startOfTodayInNewYork(now = new Date()) {
  const parts = getZonedParts(now, REFRESH_TIME_ZONE);

  return zonedTimeToUtc(
    {
      ...parts,
      hour: 0,
      minute: 0,
      second: 0
    },
    REFRESH_TIME_ZONE
  );
}

function topNewsletterItems(itemsByCategory: Record<string, NewsItem[]>) {
  const selected: DailyNewsletterEmailItem[] = [];

  for (const categoryId of CATEGORY_IDS) {
    const categoryItems = (itemsByCategory[categoryId] ?? []).slice(0, 2);

    for (const item of categoryItems) {
      selected.push({
        title: item.title,
        url: item.url,
        sourceName: item.sourceName,
        summary: item.summary,
        whyItMatters: item.whyItMatters,
        category: CATEGORY_BY_ID[categoryId].title
      });
    }
  }

  return selected.slice(0, 12);
}

async function logDelivery(input: {
  subscriptionId: string;
  userId: string | null;
  email: string;
  subject: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId?: string;
  errorMessage?: string;
}) {
  const admin = createAdminSupabaseClient();

  await admin.from("email_delivery_logs").insert({
    subscription_id: input.subscriptionId,
    user_id: input.userId,
    email: input.email,
    subject: input.subject,
    status: input.status,
    provider_message_id: input.providerMessageId ?? null,
    error_message: input.errorMessage ?? null
  });
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = createAdminSupabaseClient();
  const resend = createResendClient();
  const baseUrl = appBaseUrl();
  const dailyNews = await fileStorage.readDailyNews();
  const items = topNewsletterItems(dailyNews.categories);
  const preview = renderDailyNewsletterEmail({
    baseUrl,
    unsubscribeUrl: `${baseUrl}/api/email/unsubscribe`,
    items
  });
  const subject = preview.subject;
  const startOfDay = startOfTodayInNewYork().toISOString();
  const { data: subscriptions, error } = await admin
    .from("newsletter_subscriptions")
    .select("id,user_id,email")
    .eq("subscribed", true)
    .not("confirmed_at", "is", null);

  if (error) {
    return NextResponse.json({ error: "Could not load subscribers." }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of (subscriptions ?? []) as SubscriptionRow[]) {
    const { data: existingLogs } = await admin
      .from("email_delivery_logs")
      .select("id")
      .eq("email", subscription.email)
      .eq("subject", subject)
      .eq("status", "sent")
      .gte("sent_at", startOfDay)
      .limit(1);

    if (existingLogs?.length) {
      skipped += 1;
      continue;
    }

    const unsubscribeToken = createSecureToken();
    const unsubscribeUrl = `${baseUrl}/api/email/unsubscribe?token=${encodeURIComponent(
      unsubscribeToken
    )}`;
    const email = renderDailyNewsletterEmail({
      baseUrl,
      unsubscribeUrl,
      items
    });

    await admin
      .from("newsletter_subscriptions")
      .update({ unsubscribe_token_hash: hashToken(unsubscribeToken) })
      .eq("id", subscription.id);

    try {
      const result = await resend.emails.send({
        from: emailFromAddress(),
        to: subscription.email,
        subject: email.subject,
        html: email.html,
        text: email.text
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      await logDelivery({
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        email: subscription.email,
        subject: email.subject,
        status: "sent",
        providerMessageId: result.data?.id
      });
      sent += 1;
    } catch (error) {
      await logDelivery({
        subscriptionId: subscription.id,
        userId: subscription.user_id,
        email: subscription.email,
        subject: email.subject,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown email error."
      });
      failed += 1;
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
