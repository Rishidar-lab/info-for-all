import type { Perspective, Reliability, StoryCluster } from "@/data/demo";

/** Presentation helpers for the IFA comparison UI. No data-layer imports. */

export const PERSPECTIVE_LABEL: Record<Perspective, string> = {
  left: "Left",
  center: "Center",
  right: "Right",
};

export const RELIABILITY_LABEL: Record<Reliability, string> = {
  high: "High",
  mixed: "Mixed",
  unknown: "Unknown",
};

/** Tailwind classes keyed to the design-system tokens in globals.css. */
export const PERSPECTIVE_STYLE: Record<
  Perspective,
  { text: string; bg: string; bar: string; dot: string }
> = {
  left: {
    text: "text-evidence",
    bg: "bg-evidence-bg",
    bar: "bg-[var(--evidence)]",
    dot: "bg-[var(--evidence)]",
  },
  center: {
    text: "text-ink-2",
    bg: "bg-surface-2",
    bar: "bg-[var(--ink-3)]",
    dot: "bg-[var(--ink-3)]",
  },
  right: {
    text: "text-caution",
    bg: "bg-caution-bg",
    bar: "bg-[var(--caution)]",
    dot: "bg-[var(--caution)]",
  },
};

export const RELIABILITY_STYLE: Record<Reliability, { text: string; bg: string }> = {
  high: { text: "text-agree", bg: "bg-agree-bg" },
  mixed: { text: "text-caution", bg: "bg-caution-bg" },
  unknown: { text: "text-unknown", bg: "bg-surface-2" },
};

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function fmtDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

export function fmtDateTime(iso: string): string {
  return dateTimeFmt.format(new Date(iso));
}

export interface CoverageSegment {
  key: Perspective;
  label: string;
  pct: number;
}

/** Normalised segments (sum to 100) in a stable Left → Center → Right order. */
export function coverageSegments(story: StoryCluster): CoverageSegment[] {
  const raw = story.coverage;
  const total = raw.left + raw.center + raw.right || 1;
  const order: Perspective[] = ["left", "center", "right"];
  return order.map((key) => ({
    key,
    label: PERSPECTIVE_LABEL[key],
    pct: Math.round((raw[key] / total) * 100),
  }));
}

/** Count of distinct publications represented in a story's articles. */
export function publicationCount(story: StoryCluster): number {
  return new Set(story.articles.map((a) => a.publication)).size;
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
