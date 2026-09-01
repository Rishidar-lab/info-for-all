import type { AlertLifecycle, EvidenceRole, VerificationStatus } from "@/lib/live/types";
import {
  EVIDENCE_ROLE_LABEL,
  EVIDENCE_ROLE_STYLE,
  LIFECYCLE_LABEL,
  VERIFICATION_LABEL,
  VERIFICATION_STYLE,
} from "@/lib/live/dataset";
import { cn } from "@/lib/format";

export function EvidenceRoleBadge({ role, className }: { role: EvidenceRole; className?: string }) {
  const s = EVIDENCE_ROLE_STYLE[role];
  return (
    <span className={cn("pill", s.text, s.bg, className)} title="Evidence role — what kind of source this is, not an ideological label.">
      {EVIDENCE_ROLE_LABEL[role]}
    </span>
  );
}

export function VerificationBadge({ status, className }: { status: VerificationStatus; className?: string }) {
  const s = VERIFICATION_STYLE[status];
  return (
    <span className={cn("pill", s.text, s.bg, className)} title="Evidence status — how well corroborated this is, not a quality rating.">
      {VERIFICATION_LABEL[status]}
    </span>
  );
}

export function LifecycleBadge({ lifecycle, className }: { lifecycle: AlertLifecycle; className?: string }) {
  const tone =
    lifecycle === "active"
      ? "border-dispute/50 bg-dispute-bg text-dispute"
      : lifecycle === "update"
        ? "border-caution/50 bg-caution-bg text-caution"
        : lifecycle === "developing"
          ? "border-caution/40 bg-caution-bg text-caution"
          : "border-rule-strong bg-surface-2 text-ink-3";
  return (
    <span className={cn("pill", tone, className)}>
      {lifecycle === "active" && <span aria-hidden className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-dispute" />}
      {LIFECYCLE_LABEL[lifecycle]}
    </span>
  );
}
