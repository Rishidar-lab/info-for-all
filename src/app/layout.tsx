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
    "IFA is an evidence-oriented news-comparison interface. See the story, compare the coverage: what sources agree on, how framing differs, and where each claim came from.",
  applicationName: "IFA",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col bg-paper">
        <div className="border-b border-rule bg-caution-bg">
          <div className="mx-auto max-w-[var(--maxw)] px-4 py-1.5 ui text-[12px] leading-snug text-caution">
            <span className="font-semibold tracking-wide">DEMONSTRATION DATASET</span>
            <span className="mx-2 text-rule-strong">·</span>
            <span className="text-ink-2">
              Source metadata and story examples are synthetic and are provided to demonstrate
              IFA&rsquo;s comparison model. Nothing here is live reporting.
            </span>
          </div>
        </div>
        <SiteHeader />
        <main className="mx-auto w-full max-w-[var(--maxw)] flex-1 px-4 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
