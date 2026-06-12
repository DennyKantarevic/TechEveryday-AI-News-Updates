"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants
} from "framer-motion";
import React from "react";
import { SECTION_HEADER_ANIMATION_SECONDS } from "@/components/AnimatedSectionHeader";

const articleGridVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: SECTION_HEADER_ANIMATION_SECONDS + 0.08,
      staggerChildren: 0.08
    }
  }
};

export default function AnimatedArticleGrid({
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: false, amount: 0.5, margin: "0px 0px -12% 0px" }}
      variants={shouldReduceMotion ? undefined : articleGridVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
