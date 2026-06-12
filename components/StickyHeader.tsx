"use client";

import Link from "next/link";
import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Bookmark, BookOpen, Newspaper, Sparkles } from "lucide-react";
import BrandWordmark from "@/components/BrandWordmark";

export default function StickyHeader({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [120, 520], [0, 1]);
  const y = useTransform(scrollY, [120, 520], [-18, 0]);
  const resetNewsletterIntro = () => {
    window.scrollTo({ left: 0, top: 0 });
  };

  return (
    <motion.header
      style={alwaysVisible ? { opacity: 1, y: 0 } : { opacity, y }}
      className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-bone/95 backdrop-blur"
    >
      <div className="editorial-shell relative flex min-h-16 items-center justify-between gap-3 py-2">
        <nav className="flex items-center gap-2" aria-label="Primary">
          <Link
            href="/"
            onClick={resetNewsletterIntro}
            className="inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-white px-2 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] md:px-3"
            aria-label="Newsletter"
          >
            <Newspaper size={18} strokeWidth={2.5} />
            <span className="hidden text-xs font-black uppercase tracking-[0.12em] lg:inline">
              Newsletter
            </span>
          </Link>
          <Link
            href="/learning"
            className="inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-white px-2 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] md:px-3"
            aria-label="Learning"
          >
            <BookOpen size={18} strokeWidth={2.5} />
            <span className="hidden text-xs font-black uppercase tracking-[0.12em] lg:inline">
              Learning
            </span>
          </Link>
          <Link
            href="/for-you"
            className="inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-white px-2 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] md:px-3"
            aria-label="For You"
          >
            <Sparkles size={18} strokeWidth={2.5} />
            <span className="hidden text-xs font-black uppercase tracking-[0.12em] lg:inline">
              For You
            </span>
          </Link>
        </nav>
        <Link
          href="/"
          onClick={resetNewsletterIntro}
          className="absolute left-1/2 -translate-x-1/2 font-display text-lg font-black leading-none md:text-2xl"
        >
          <BrandWordmark />
        </Link>
        <Link
          href="/gallery"
          className="inline-flex h-10 items-center justify-center gap-2 border-2 border-ink bg-white px-2 transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#111] md:px-3"
          aria-label="Gallery"
        >
          <Bookmark size={18} strokeWidth={2.5} />
          <span className="hidden text-xs font-black uppercase tracking-[0.12em] lg:inline">
            Gallery
          </span>
        </Link>
      </div>
    </motion.header>
  );
}
