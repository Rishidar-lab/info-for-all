import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4 py-8 ui text-[13px] text-ink-3">
        <div className="flex flex-wrap justify-between gap-6">
          <div className="max-w-md">
            <p className="font-serif text-[15px] text-ink">
              {BRAND.name} <span className="label align-middle">{BRAND.full}</span>
            </p>
            <p className="mt-1 leading-relaxed">
              {BRAND.blurb} Crisis, politics, finance and sports first; celebrity and
              entertainment are excluded from the default feed. {BRAND.tagline}
            </p>
            <p className="mt-2 text-[11.5px] text-ink-3">
              Formerly &ldquo;{BRAND.legacy}&rdquo; ({BRAND.legacyShort}). {BRAND.versionLabel}.
            </p>
          </div>
          <nav className="flex gap-10">
            <div className="flex flex-col gap-1">
              <span className="label">Navigate</span>
              <Link href="/" className="link-quiet">Right now</Link>
              <Link href="/trends/" className="link-quiet">Trends</Link>
              <Link href="/tamil-nadu/" className="link-quiet">Tamil Nadu</Link>
              <Link href="/sources/" className="link-quiet">Sources</Link>
              <Link href="/about/" className="link-quiet">Methodology</Link>
              <Link href="/methodology/examples/" className="link-quiet">Demonstrations</Link>
            </div>
          </nav>
        </div>
        <p className="mt-8 border-t border-rule pt-4 text-[12px] leading-relaxed">
          {BRAND.name} aggregates publicly available RSS / CAP feeds and always links to the
          original publisher. It stores only headlines, timestamps, short feed excerpts and
          structured alert metadata — never full articles, and it never bypasses paywalls or
          access controls. <strong>{BRAND.name} is not an emergency service;</strong> for any
          emergency, follow the issuing authority&rsquo;s own instructions.
        </p>
      </div>
    </footer>
  );
}
