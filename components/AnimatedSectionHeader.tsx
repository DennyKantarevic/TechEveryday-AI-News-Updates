"use client";

import {
  motion,
  useReducedMotion,
  type HTMLMotionProps,
  type Variants
} from "framer-motion";
import React from "react";

export const SECTION_HEADER_ANIMATION_SECONDS = 0.52;

const headerVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 64
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: SECTION_HEADER_ANIMATION_SECONDS,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export default function AnimatedSectionHeader({
  direction,
  children,
  ...props
}: Omit<HTMLMotionProps<"div">, "children"> & {
  direction: "left" | "right";
  children: React.ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const directionValue = direction === "left" ? -1 : 1;

  return (
    <motion.div
      custom={directionValue}
      initial={shouldReduceMotion ? false : "hidden"}
      whileInView={shouldReduceMotion ? undefined : "visible"}
      viewport={{ once: false, amount: 0.55, margin: "0px 0px -12% 0px" }}
      variants={shouldReduceMotion ? undefined : headerVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}
