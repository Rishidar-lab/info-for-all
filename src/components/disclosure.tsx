import type { ReactNode } from "react";

/**
 * Progressive-disclosure block built on native <details> — works without JS,
 * keeps the page crawlable, and matches IFA's "expand to verify" model.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  return (
    <details open={defaultOpen} className={className}>
      <summary className="ui flex items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline">
        <span aria-hidden className="disclosure-caret inline-block transition-transform">
          ▸
        </span>
        {summary}
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
