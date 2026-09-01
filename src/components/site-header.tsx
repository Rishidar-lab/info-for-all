import Link from "next/link";
import { SearchBox } from "./search-box";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/events", label: "Events" },
  { href: "/sources", label: "Sources" },
  { href: "/topics", label: "Topics" },
  { href: "/evidence", label: "Evidence" },
  { href: "/methodology", label: "Methodology" },
  { href: "/about", label: "About" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4">
        <div className="flex items-baseline justify-between gap-6 py-3">
          <Link href="/" className="link-quiet flex items-baseline gap-2">
            <span className="font-serif text-[22px] font-semibold tracking-tight text-ink">
              Info For All
            </span>
            <span className="label hidden sm:inline">IFA</span>
          </Link>
          <p className="ui hidden text-[12px] text-ink-3 md:block">
            See the story · check the sources · find the common ground
          </p>
        </div>
        <div className="flex flex-col gap-2 pb-2 md:flex-row md:items-center md:justify-between">
          <nav className="ui flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="link-quiet text-ink-2 hover:text-accent">
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="md:w-80">
            <SearchBox />
          </div>
        </div>
      </div>
    </header>
  );
}
