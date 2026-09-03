import Link from "next/link";
import { BRAND } from "@/lib/brand";

const PRIMARY = [
  { href: "/", label: "Top stories" },
  { href: "/landscape/", label: "Media landscape" },
  { href: "/crisis/", label: "Crisis" },
  { href: "/politics/", label: "Politics" },
  { href: "/finance/", label: "Finance" },
  { href: "/sports/", label: "Sports" },
  { href: "/search/", label: "Search" },
] as const;

const SECONDARY = [
  { href: "/tamil-nadu/landscape/", label: "Tamil Nadu landscape" },
  { href: "/india/", label: "India" },
  { href: "/sources/", label: "Sources" },
  { href: "/source/compare/", label: "Compare sources" },
  { href: "/trends/", label: "Trends" },
  { href: "/about/", label: "Methodology" },
  { href: "/methodology/quality/", label: "Quality" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link href="/" className="link-quiet flex items-baseline gap-2.5">
            <span className="font-serif text-[21px] font-semibold tracking-tight text-ink">{BRAND.name}</span>
            <span className="label hidden rounded-[2px] border border-rule-strong px-1.5 py-0.5 sm:inline">
              {BRAND.full}
            </span>
            <span className="ui hidden text-[11px] text-ink-3 md:inline">{BRAND.region}</span>
          </Link>

          <nav className="ui flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px]">
            {PRIMARY.map((item) => (
              <Link key={item.href} href={item.href} className="link-quiet whitespace-nowrap text-ink-2 hover:text-accent">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <nav className="ui flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule pb-2 pt-1.5 text-[12px] text-ink-3">
          {SECONDARY.map((item) => (
            <Link key={item.href} href={item.href} className="link-quiet hover:text-accent">
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
