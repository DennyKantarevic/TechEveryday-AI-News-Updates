"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import React, { useEffect } from "react";

export const PAGE_TRANSITION_SECONDS = 0.92;

export function routeTransitionDirection(pathname: string) {
  if (pathname.startsWith("/learning")) {
    return -1;
  }

  if (pathname.startsWith("/for-you")) {
    return -1;
  }

  if (pathname.startsWith("/gallery")) {
    return 1;
  }

  return -1;
}

const pageVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0.86,
    x: direction < 0 ? "-100vw" : "100vw"
  }),
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: PAGE_TRANSITION_SECONDS,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: (direction: number) => ({
    opacity: 0.55,
    x: direction < 0 ? "100vw" : "-100vw",
    transition: {
      duration: 0.42,
      ease: [0.4, 0, 0.2, 1]
    }
  })
};

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const direction = routeTransitionDirection(pathname);

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0 });
  }, [pathname]);

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <div
      data-testid="page-transition-frame"
      className="relative w-full max-w-full overflow-x-clip"
    >
      <motion.div
        key={pathname}
        custom={direction}
        data-testid="page-transition"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="min-h-screen w-full max-w-full overflow-x-clip"
      >
        {children}
      </motion.div>
    </div>
  );
}
