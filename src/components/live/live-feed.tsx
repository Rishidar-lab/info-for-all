"use client";

import { useMemo, useState } from "react";
import type { LiveCluster } from "@/lib/live/types";
import { ClusterCard } from "./cluster-card";
import { cn } from "@/lib/format";

type Lang = "all" | "ta" | "en";
type Geo = "all" | "tamil-nadu" | "india";

export interface LiveFeedProps {
  active: LiveCluster[];
  developing: LiveCluster[];
  tamilNadu: LiveCluster[];
  india: LiveCluster[];
  comparisons: LiveCluster[];
  singleReports: LiveCluster[];
  districts: string[];
  counts: {
    activeCrisis: number;
    comparisons: number;
    singleReports: number;
    weakMatchesRejected: number;
    distinctPublishers: number;
    workingFeeds: number;
    failedFeeds: number;
  };
}

function match(c: LiveCluster, lang: Lang, geo: Geo, district: string): boolean {
  if (lang !== "all" && !c.languages.includes(lang)) return false;
  if (geo === "tamil-nadu" && c.scope !== "tamil-nadu") return false;
  if (geo === "india" && !(c.scope === "india" || c.scope === "india-relevant")) return false;
  if (district && !c.districts.includes(district)) return false;
  return true;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "ui rounded-[2px] border px-2.5 py-1 text-[12px] font-semibold transition-colors",
        active
          ? "border-accent bg-accent-soft text-accent"
          : "border-rule-strong text-ink-2 hover:border-accent hover:text-accent",
      )}
    >
      {children}
    </button>
  );
}

function Section({
  id,
  n,
  label,
  title,
  note,
  clusters,
  emphasis,
  emptyText,
}: {
  id: string;
  n: string;
  label: string;
  title: string;
  note?: string;
  clusters: LiveCluster[];
  emphasis?: boolean;
  emptyText: string;
}) {
  return (
    <section id={id} className="scroll-mt-4">
      <div className="mb-3 border-b border-rule-strong pb-2">
        <div className="label mb-1">
          <span className="mono text-ink-3">{n}</span> · {label}
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-[20px] font-semibold text-ink">{title}</h2>
          <span className="ui text-[12px] text-ink-3">{clusters.length} shown</span>
        </div>
        {note && <p className="ui mt-1 text-[12px] leading-snug text-ink-3">{note}</p>}
      </div>
      {clusters.length === 0 ? (
        <p className="card bg-surface-2 px-4 py-3 ui text-[13px] text-ink-2">{emptyText}</p>
      ) : (
        <div className={cn("grid gap-3", emphasis ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3")}>
          {clusters.map((c) => (
            <ClusterCard key={c.id} cluster={c} emphasis={emphasis} />
          ))}
        </div>
      )}
    </section>
  );
}

export function LiveFeed(props: LiveFeedProps) {
  const [lang, setLang] = useState<Lang>("all");
  const [geo, setGeo] = useState<Geo>("all");
  const [district, setDistrict] = useState<string>("");

  const { active, developing, tamilNadu, india, comparisons, singleReports } = useMemo(() => {
    const f = (list: LiveCluster[]) => list.filter((c) => match(c, lang, geo, district));
    return {
      active: f(props.active),
      developing: f(props.developing),
      tamilNadu: f(props.tamilNadu),
      india: f(props.india),
      comparisons: f(props.comparisons),
      singleReports: f(props.singleReports),
    };
  }, [props.active, props.developing, props.tamilNadu, props.india, props.comparisons, props.singleReports, lang, geo, district]);

  return (
    <div className="flex flex-col gap-8">
      <div className="card bg-surface-2 p-3.5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="label">Language</span>
            <Chip active={lang === "all"} onClick={() => setLang("all")}>All</Chip>
            <Chip active={lang === "ta"} onClick={() => setLang("ta")}>தமிழ்</Chip>
            <Chip active={lang === "en"} onClick={() => setLang("en")}>English</Chip>
          </div>
          <div className="flex items-center gap-2">
            <span className="label">Geography</span>
            <Chip active={geo === "all"} onClick={() => setGeo("all")}>All</Chip>
            <Chip active={geo === "tamil-nadu"} onClick={() => setGeo("tamil-nadu")}>Tamil Nadu</Chip>
            <Chip active={geo === "india"} onClick={() => setGeo("india")}>India</Chip>
          </div>
          {props.districts.length > 0 && (
            <label className="flex items-center gap-2">
              <span className="label">District</span>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="ui rounded-[2px] border border-rule-strong bg-surface px-2 py-1 text-[12px] text-ink-2"
              >
                <option value="">Any</option>
                {props.districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(lang !== "all" || geo !== "all" || district) && (
            <button
              type="button"
              onClick={() => {
                setLang("all");
                setGeo("all");
                setDistrict("");
              }}
              className="ui text-[12px] font-semibold text-accent hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-rule pt-2.5 ui text-[11.5px] text-ink-3">
          <span><strong className="mono text-ink">{props.counts.activeCrisis}</strong> active alerts</span>
          <span className="text-rule-strong">·</span>
          <span><strong className="mono text-ink">{props.counts.comparisons}</strong> verified multi-source comparisons</span>
          <span className="text-rule-strong">·</span>
          <span><strong className="mono text-ink">{props.counts.singleReports}</strong> single reports</span>
          <span className="text-rule-strong">·</span>
          <span><strong className="mono text-ink">{props.counts.distinctPublishers}</strong> publishers</span>
          <span className="text-rule-strong">·</span>
          <span>
            <strong className="mono text-ink">{props.counts.workingFeeds}</strong>/{props.counts.workingFeeds + props.counts.failedFeeds} feeds
          </span>
          {props.counts.weakMatchesRejected > 0 && (
            <>
              <span className="text-rule-strong">·</span>
              <span title="Cross-publisher pairings that did not meet the confidence bar for a comparison.">
                <strong className="mono text-ink">{props.counts.weakMatchesRejected}</strong> weak matches kept separate
              </span>
            </>
          )}
        </div>
      </div>

      <Section
        id="active-alerts"
        n="01"
        label="Active crisis / public-safety alerts"
        title="Active alerts"
        note="Official alerts currently in effect. Expired and all-clear notices are not shown here."
        clusters={active}
        emphasis
        emptyText={
          props.active.length === 0
            ? "No active official crisis alert was found in the latest successful refresh."
            : "No active alert matches the current filters. Alerts exist in this refresh — clear the filters above to see them."
        }
      />

      {developing.length > 0 && (
        <Section
          id="developing"
          n="01b"
          label="Developing"
          title="Developing — monitoring"
          note="Situations being tracked (e.g. river levels above normal) that are not a formal in-effect alert."
          clusters={developing}
          emptyText="Nothing developing under the current filters."
        />
      )}

      <Section
        id="tamil-nadu"
        n="02"
        label="Tamil Nadu"
        title="Tamil Nadu now"
        clusters={tamilNadu}
        emptyText="No Tamil Nadu items matched the current filters."
      />

      <Section
        id="india"
        n="03"
        label="India — major developments"
        title="India — major developments"
        note="India-wide items that materially affect Tamil Nadu or carry major national public importance."
        clusters={india}
        emptyText="No India items matched the current filters."
      />

      <Section
        id="comparisons"
        n="04"
        label="Verified multi-source comparisons"
        title="Same event, reported by two or more publishers"
        note="Only clusters with 2+ distinct publishers and strong or probable matching confidence. Differences shown are in structured metadata (locations, times, headline emphasis, stated severity) — not semantic claims."
        clusters={comparisons}
        emptyText={
          props.counts.comparisons === 0
            ? "No verified multi-source comparison is available in this refresh. When two or more publishers cover the same identifiable event, it will appear here."
            : "No verified comparison matches the current filters."
        }
      />

      <Section
        id="single-reports"
        n="05"
        label="Single reports"
        title="Reported by one publisher so far"
        note="Not yet corroborated by a second publisher. Inspect the report and its source context."
        clusters={singleReports}
        emptyText="No single reports match the current filters."
      />
    </div>
  );
}
