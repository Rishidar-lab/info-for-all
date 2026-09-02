import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BRAND, BRAND_TITLE } from "@/lib/brand";

export const metadata: Metadata = {
  title: {
    default: BRAND_TITLE,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.blurb,
  applicationName: BRAND.name,
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
