import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/sources", label: "Sources" },
  { href: "/about", label: "Methodology" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-rule-strong bg-surface">
      <div className="mx-auto max-w-[var(--maxw)] px-4">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
          <Link href="/" className="link-quiet flex items-baseline gap-2.5">
            <span className="font-serif text-[21px] font-semibold tracking-tight text-ink">
              Info For All
            </span>
            <span className="label rounded-[2px] border border-rule-strong px-1.5 py-0.5">
              IFA
            </span>
          </Link>

          <nav className="ui flex items-center gap-x-5 gap-y-1 text-[13px]">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="link-quiet text-ink-2 hover:text-accent"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
