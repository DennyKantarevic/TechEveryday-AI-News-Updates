import type { Metadata } from "next";
import type { ReactNode } from "react";
import PageTransition from "@/components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: "TechEveryday - AI News Updates",
  description:
    "A daily curated technology newsletter for AI, research, systems, cloud, and developer tools."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
