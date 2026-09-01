import Link from "next/link";
import type { ReactNode } from "react";
import type { CgiBand, ClaimStatus } from "@/lib/domain/types";
import { BAND_STYLE, STATUS_STYLE } from "@/lib/ui";
import { cn } from "@/lib/format";

export function SectionHeading({
  label,
  title,
  note,
  id,
}: {
  label?: string;
  title: string;
  note?: ReactNode;
  id?: string;
}) {
  return (
    <div id={id} className="mb-3 border-b border-rule-strong pb-2">
      {label && <div className="label mb-1">{label}</div>}
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-[20px] font-semibold text-ink">{title}</h2>
        {note && <div className="ui text-[12px] text-ink-3">{note}</div>}
      </div>
    </div>
  );
}

export function CgiBadge({
  score,
  band,
  size = "md",
  href,
}: {
  score: number;
  band: CgiBand;
  size?: "sm" | "md" | "lg";
  href?: string;
}) {
  const style = BAND_STYLE[band];
  const inner = (
    <span
      className={cn(
        "inline-flex items-center gap-2 border border-rule-strong",
        style.bg,
        size === "lg" ? "px-3 py-1.5" : size === "sm" ? "px-1.5 py-0.5" : "px-2 py-1",
      )}
      title={`Common Ground Index ${score} / 100 — ${style.label}`}
    >
      <span className="label !tracking-wider">CGI</span>
      <span
        className={cn(
          "mono font-semibold tabular-nums",
          style.text,
          size === "lg" ? "text-[22px]" : size === "sm" ? "text-[13px]" : "text-[16px]",
        )}
      >
        {score}
      </span>
      <span className={cn("ui font-medium", style.text, size === "lg" ? "text-[12px]" : "text-[11px]")}>
        {style.short}
      </span>
    </span>
  );
  return href ? (
    <Link href={href} className="link-quiet">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export function StatusPill({ status }: { status: ClaimStatus }) {
  const style = STATUS_STYLE[status];
  return <span className={cn("pill", style.text, style.bg)}>{style.label}</span>;
}

export function EvidenceMark({ primary }: { primary: boolean }) {
  return primary ? (
    <span className="pill bg-evidence-bg text-evidence" title="Primary evidence">
      ▣ Primary evidence
    </span>
  ) : (
    <span className="pill text-ink-3" title="Journalism / secondary">
      ◇ Secondary
    </span>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "agree" | "dispute" | "evidence" | "muted" }) {
  const toneClass =
    tone === "agree"
      ? "text-agree"
      : tone === "dispute"
        ? "text-dispute"
        : tone === "evidence"
          ? "text-evidence"
          : "text-ink";
  return (
    <div className="flex flex-col">
      <span className={cn("mono text-[17px] font-semibold tabular-nums", toneClass)}>{value}</span>
      <span className="label">{label}</span>
    </div>
  );
}

export function Rule({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-rule", className)} />;
}

export function DemoTag() {
  return <span className="pill text-ink-3">demo</span>;
}
