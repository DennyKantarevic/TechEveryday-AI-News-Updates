"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import BrandWordmark from "@/components/BrandWordmark";

export default function HeroTitle() {
  const ref = useRef<HTMLElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"]
  });
  const scale = useTransform(scrollYProgress, [0, 0.76], [1, 0.28]);
  const y = useTransform(scrollYProgress, [0, 0.76], ["0vh", "-41vh"]);
  const opacity = useTransform(scrollYProgress, [0, 0.68, 0.9], [1, 1, 0]);

  return (
    <section ref={ref} className="relative h-[140vh]">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          style={{ scale, y, opacity }}
          className="px-4 text-center will-change-transform"
        >
          <motion.h1 className="font-display text-[clamp(3rem,11vw,11rem)] font-black leading-none text-ink">
            <BrandWordmark />
          </motion.h1>
        </motion.div>
      </div>
    </section>
  );
}
