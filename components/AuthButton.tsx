"use client";

import Link from "next/link";
import { LogOut, UserRound } from "lucide-react";
import React from "react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    try {
      const supabase = createClient();

      supabase.auth.getUser().then(({ data }) => {
        if (active) {
          setUser(data.user ?? null);
          setLoaded(true);
        }
      });

      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        setLoaded(true);
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    } catch {
      setLoaded(true);
      return undefined;
    }
  }, []);

  async function signOut() {
    try {
      await createClient().auth.signOut();
      setUser(null);
    } catch {
      setUser(null);
    }
  }

  if (!loaded || !user) {
    return (
      <Link
        href="/login"
        className="inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-white px-2 text-xs font-black uppercase tracking-[0.12em] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] md:px-3"
      >
        <UserRound size={17} strokeWidth={2.5} />
        <span className="hidden lg:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        className="inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-white px-2 text-xs font-black uppercase tracking-[0.12em] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] md:px-3"
      >
        <UserRound size={17} strokeWidth={2.5} />
        <span className="hidden lg:inline">Account</span>
      </Link>
      <button
        type="button"
        onClick={signOut}
        className="inline-flex h-10 w-10 items-center justify-center border-2 border-ink bg-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]"
        aria-label="Sign out"
      >
        <LogOut size={17} strokeWidth={2.5} />
      </button>
    </div>
  );
}
