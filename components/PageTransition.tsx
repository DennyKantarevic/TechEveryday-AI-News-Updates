"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import React from "react";

export function routeTransitionDirection(pathname: string) {
  if (pathname.startsWith("/learning")) {
    return -1;
  }

  if (pathname.startsWith("/for-you")) {
    return 1;
  }

  return 0;
}

const pageVariants: Variants = {
  initial: (direction: number) => ({
    opacity: direction === 0 ? 0 : 0.92,
    x: direction * 44
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.42,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction === 0 ? 0 : direction * -28,
    transition: {
      duration: 0.24,
      ease: [0.4, 0, 0.2, 1]
    }
  })
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const direction = routeTransitionDirection(pathname);

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        custom={direction}
        data-testid="page-transition"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
