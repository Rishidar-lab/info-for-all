import Link from "next/link";
import { BRAND } from "@/lib/brand";

const READ = [
  { href: "/", label: "Home" },
  { href: "/tamil-nadu/", label: "Tamil Nadu" },
  { href: "/india/", label: "India" },
  { href: "/trends/", label: "Trends" },
  { href: "/search/", label: "Search" },
];

const UNDERSTAND = [
  { href: "/landscape/", label: "Media landscape" },
  { href: "/sources/", label: "Sources" },
  { href: "/about/", label: "Methodology" },
  { href: "/methodology/quality/", label: "Quality dashboard" },
  { href: "/methodology/examples/", label: "Worked examples" },
  { href: "/diagnostics/", label: "Diagnostics" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4 py-8 ui text-[13px] text-ink-3">
        <div className="grid gap-8 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
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
            <p className="mt-2 text-[11.5px]">
              <a href={BRAND.repoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                Source, issues &amp; project contact on GitHub →
              </a>
            </p>
          </div>

          <nav aria-label="Read" className="flex flex-col gap-1">
            <span className="label">Read</span>
            {READ.map((l) => (
              <Link key={l.href} href={l.href} className="link-quiet hover:text-accent">
                {l.label}
              </Link>
            ))}
          </nav>

          <nav aria-label="Understand" className="flex flex-col gap-1">
            <span className="label">Understand</span>
            {UNDERSTAND.map((l) => (
              <Link key={l.href} href={l.href} className="link-quiet hover:text-accent">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className="mt-8 border-t border-rule pt-4 text-[12px] leading-relaxed">
          {BRAND.name} aggregates publicly available RSS / CAP feeds and always links to the
          original publisher. It stores only headlines, timestamps, short feed excerpts and
          structured alert metadata — never full articles, and it never bypasses paywalls or
          access controls. It runs no analytics by default and sets no tracking cookies.{" "}
          <strong>{BRAND.name} is not an emergency service;</strong> for any emergency, follow
          the issuing authority&rsquo;s own instructions.
        </p>
      </div>
    </footer>
  );
}
