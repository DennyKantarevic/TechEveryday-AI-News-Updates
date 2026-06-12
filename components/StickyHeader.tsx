"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bookmark, Newspaper } from "lucide-react";

export default function StickyHeader({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [120, 520], [0, 1]);
  const y = useTransform(scrollY, [120, 520], [-18, 0]);

  return (
    <motion.header
      style={alwaysVisible ? { opacity: 1, y: 0 } : { opacity, y }}
      className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-bone/95 backdrop-blur"
    >
      <div className="editorial-shell relative flex h-16 items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-ink bg-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]"
          aria-label="Go to newsletter"
        >
          <Newspaper size={18} strokeWidth={2.5} />
        </Link>
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 font-display text-xl font-black leading-none md:text-2xl"
        >
          TechEveryday
        </Link>
        <Link
          href="/gallery"
          className="inline-flex h-10 w-10 items-center justify-center border-2 border-ink bg-white transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111]"
          aria-label="Open gallery"
        >
          <Bookmark size={18} strokeWidth={2.5} />
        </Link>
      </div>
    </motion.header>
  );
}
