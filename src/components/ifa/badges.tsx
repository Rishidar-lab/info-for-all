import type { Perspective, Reliability } from "@/data/demo";
import {
  PERSPECTIVE_LABEL,
  PERSPECTIVE_STYLE,
  RELIABILITY_LABEL,
  RELIABILITY_STYLE,
} from "@/lib/ifa";
import { cn } from "@/lib/format";

export function PerspectiveBadge({
  perspective,
  className,
}: {
  perspective: Perspective;
  className?: string;
}) {
  const s = PERSPECTIVE_STYLE[perspective];
  return (
    <span
      className={cn("pill", s.text, s.bg, className)}
      title={`Editorial perspective: ${PERSPECTIVE_LABEL[perspective]} (broad orientation, not a measure of accuracy)`}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {PERSPECTIVE_LABEL[perspective]}
    </span>
  );
}

export function ReliabilityBadge({
  reliability,
  className,
}: {
  reliability: Reliability;
  className?: string;
}) {
  const s = RELIABILITY_STYLE[reliability];
  return (
    <span
      className={cn("pill", s.text, s.bg, className)}
      title={`Reliability: ${RELIABILITY_LABEL[reliability]} (demonstration metadata, separate from perspective)`}
    >
      {RELIABILITY_LABEL[reliability]} reliability
    </span>
  );
}
