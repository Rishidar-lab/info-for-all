"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/format";

export interface StoryTab {
  id: string;
  label: string;
  /** Small count shown next to the label, when meaningful. */
  count?: number;
  content: ReactNode;
}

/**
 * The story page's section switcher. One section visible at a time (kept in the
 * DOM, toggled with `hidden`, so it works without JS and is screen-reader sane).
 */
export function StoryTabs({ tabs, initial }: { tabs: StoryTab[]; initial?: string }) {
  const first = initial && tabs.some((t) => t.id === initial) ? initial : tabs[0]?.id;
  const [active, setActive] = useState(first);

  return (
    <div className="min-w-0">
      <div
        role="tablist"
        aria-label="Story sections"
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-rule-strong pb-px"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`storytab-${t.id}`}
            onClick={() => setActive(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-t px-3 py-2 ui text-[12.5px] font-semibold transition-colors",
              active === t.id
                ? "border-b-2 border-accent text-ink"
                : "border-b-2 border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            {t.label}
            {typeof t.count === "number" && (
              <span className="ml-1.5 mono text-[11px] text-ink-3">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`storytab-${t.id}`}
          hidden={active !== t.id}
          className="pt-5"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
