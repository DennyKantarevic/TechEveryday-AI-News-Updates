import { redirect } from "next/navigation";
import React from "react";
import AccountSettings from "@/components/AccountSettings";
import StickyHeader from "@/components/StickyHeader";
import { getCurrentUser } from "@/lib/auth/get-user";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { supabase, user } = await getCurrentUser();

  if (!supabase || !user) {
    redirect("/login?next=/account");
  }

  const [{ data: profile }, { data: preferences }, { data: subscription }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name,email")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_preferences")
        .select("email_subscribed,personalization_enabled")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("newsletter_subscriptions")
        .select("subscribed")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <AccountSettings
          profile={{
            displayName: profile?.display_name ?? "",
            email: profile?.email ?? user.email ?? ""
          }}
          preferences={{
            emailSubscribed:
              Boolean(preferences?.email_subscribed) && Boolean(subscription?.subscribed),
            personalizationEnabled: preferences?.personalization_enabled ?? true
          }}
        />
      </main>
    </>
  );
}
