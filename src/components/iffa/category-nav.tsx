import Link from "next/link";
import { CATEGORY_LABEL } from "@/lib/domain/categories";
import { categoryCounts } from "@/lib/live/trends-view";
import { cn } from "@/lib/format";

const TABS = [
  { href: "/crisis/", cat: "crisis" as const },
  { href: "/politics/", cat: "politics" as const },
  { href: "/finance/", cat: "finance" as const },
  { href: "/sports/", cat: "sports" as const },
];

export function CategoryNav({ active }: { active?: string }) {
  const counts = categoryCounts();
  return (
    <nav className="flex flex-wrap gap-2">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "ui inline-flex items-baseline gap-1.5 rounded-[2px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
            active === t.cat
              ? "border-accent bg-accent-soft text-accent"
              : "border-rule-strong text-ink-2 hover:border-accent hover:text-accent",
          )}
        >
          {CATEGORY_LABEL[t.cat]}
          <span className="mono text-[11px] text-ink-3">{counts[t.cat] ?? 0}</span>
        </Link>
      ))}
      <Link
        href="/trends/"
        className={cn(
          "ui inline-flex items-center rounded-[2px] border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
          active === "trends"
            ? "border-accent bg-accent-soft text-accent"
            : "border-rule-strong text-ink-2 hover:border-accent hover:text-accent",
        )}
      >
        All trends
      </Link>
    </nav>
  );
}
