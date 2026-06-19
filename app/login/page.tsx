import Link from "next/link";
import React, { Suspense } from "react";
import AuthFormMessage from "@/components/AuthFormMessage";
import BrandWordmark from "@/components/BrandWordmark";
import StickyHeader from "@/components/StickyHeader";
import { signInWithMagicLink } from "@/lib/auth/actions";

export default function LoginPage() {
  return (
    <>
      <StickyHeader alwaysVisible />
      <main className="editorial-shell min-h-screen pb-24 pt-28">
        <section className="grid gap-8 border-2 border-ink bg-white p-6 shadow-[8px_8px_0_#111] md:grid-cols-[0.95fr_1.05fr] md:p-10">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-clay">
              Account access
            </p>
            <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
              Sign in
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-ink/75 md:text-base">
              Privacy-first account system for saved articles, preferences, and optional
              reading signals.
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-ink/75">
              Your saved articles and preferences are private to your account. You can clear
              reading history or unsubscribe anytime.
            </p>
          </div>

          <form action={signInWithMagicLink} className="border-2 border-ink bg-bone p-5">
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
              Send magic link
            </button>
            <Suspense fallback={null}>
              <AuthFormMessage />
            </Suspense>
            <p className="mt-4 text-xs leading-5 text-ink/65">
              Authentication is handled by Supabase Auth. TechEveryday does not store
              passwords in app tables.
            </p>
            <Link href="/signup" className="mt-4 inline-block text-sm font-black underline">
              Create an account
            </Link>
          </form>
        </section>
      </main>
    </>
  );
}
