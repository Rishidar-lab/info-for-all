import { DEMO_NOTICE } from "@/data/demo";
import { cn } from "@/lib/format";

/** The standard demonstration-data disclosure. Used on every primary screen. */
export function DemoNotice({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "card border-caution/40 bg-caution-bg px-3 py-2.5 ui text-[12.5px] leading-snug text-ink-2",
        className,
      )}
      role="note"
    >
      <span className="label !text-caution">Demonstration dataset</span>
      <span className="mt-1 block">{DEMO_NOTICE}</span>
    </aside>
  );
}
