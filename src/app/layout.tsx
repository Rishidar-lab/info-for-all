import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: "Info For All — IFA",
    template: "%s · IFA",
  },
  description:
    "A crisis-first, evidence-oriented news comparison platform for Tamil Nadu and India. Official alerts and independent reporting grouped by event, with provenance and uncertainty made visible.",
  applicationName: "IFA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-paper">
        <SiteHeader />
        <main className="mx-auto w-full max-w-[var(--maxw)] flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
