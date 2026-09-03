import type { Metadata } from "next";
import { dataset } from "@/lib/live/dataset";
import { buildLandscapeSummary } from "@/lib/media-landscape/dashboard";
import { LandscapeDashboard } from "@/components/media/landscape-dashboard";

export const metadata: Metadata = {
  title: "Today's media landscape",
  description: "How India and Tamil Nadu news is being covered right now — volume, publishers, ownership, language, entities, asymmetry and evidence.",
};

export default function LandscapePage() {
  const s = buildLandscapeSummary(dataset);
  return (
    <div className="min-w-0 pb-8">
      <header className="border-b-2 border-ink/80 pb-4">
        <div className="label">Media landscape</div>
        <h1 className="mt-1 font-serif text-[27px] font-semibold leading-tight sm:text-[33px]">
          Today&rsquo;s media landscape
        </h1>
        <p className="ui mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-3">
          What was published, by whom, in what language, with what evidence — and where coverage is
          asymmetric. Snapshot-scoped counts, not a political scoreboard.
        </p>
      </header>
      <div className="mt-6">
        <LandscapeDashboard s={s} scope="India / Tamil Nadu" />
      </div>
    </div>
  );
}
