import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { DemoBanner } from "@/components/demo-banner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: {
    default: "IFA — Info For All",
    template: "%s · IFA",
  },
  description:
    "Evidence-first news intelligence. See the story, check the sources, find the common ground.",
  applicationName: "IFA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-paper">
        {env.isDemoMode && <DemoBanner />}
        <SiteHeader />
        <main className="mx-auto w-full max-w-[var(--maxw)] flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
