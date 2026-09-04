import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { SiteNav, UtilityStrip } from "./site-nav";

export function SiteHeader() {
  return (
    <header className="border-b border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4">
        <div className="flex items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link href="/" className="link-quiet flex items-baseline gap-2.5">
            <span className="font-serif text-[21px] font-semibold tracking-tight text-ink">{BRAND.name}</span>
            <span className="label hidden rounded-[2px] border border-rule-strong px-1.5 py-0.5 sm:inline">
              {BRAND.full}
            </span>
            <span className="ui hidden text-[11px] text-ink-3 lg:inline">{BRAND.region}</span>
          </Link>

          <SiteNav />
        </div>
        <UtilityStrip />
      </div>
    </header>
  );
}
