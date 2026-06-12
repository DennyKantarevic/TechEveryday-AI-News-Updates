import Link from "next/link";
import React from "react";
import BrandWordmark from "@/components/BrandWordmark";
import NewsletterSignupForm from "@/components/newsletter/NewsletterSignupForm";
import StickyHeader from "@/components/StickyHeader";
import { signUpWithMagicLink } from "@/lib/auth/actions";

export default function SignupPage() {
  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <section className="grid gap-8 border-2 border-ink bg-white p-6 shadow-[8px_8px_0_#111] md:grid-cols-[0.95fr_1.05fr] md:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
              New account
            </p>
            <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
              Create account
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-ink/75 md:text-base">
              Save articles across devices, keep preferences private to your account, and
              opt in to daily email updates only when you choose.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-ink/75">
              We store your email for login/subscriptions, saved articles, preferences, and
              optional reading signals used for For You recommendations.
            </p>
            <NewsletterSignupForm />
          </div>

          <form action={signUpWithMagicLink} className="border-2 border-ink bg-bone p-5">
            <div className="font-display text-3xl font-black leading-none">
              <BrandWordmark />
            </div>
            <label className="mt-6 block text-xs font-black uppercase tracking-[0.16em]">
              Email
              <input
                required
                type="email"
                name="email"
                placeholder="you@example.com"
                className="mt-2 h-12 w-full border-2 border-ink bg-white px-3 text-sm font-bold outline-none"
              />
            </label>
            <button className="mt-5 h-12 w-full border-2 border-ink bg-ink px-4 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-ink">
              Send signup link
            </button>
            <p className="mt-4 text-xs leading-5 text-ink/65">
              Authentication is handled by Supabase Auth. TechEveryday does not store
              passwords in app tables.
            </p>
            <Link href="/login" className="mt-4 inline-block text-sm font-black underline">
              Already have an account?
            </Link>
          </form>
        </section>
      </main>
    </>
  );
}
