import type { Metadata } from "next";
import Link from "next/link";
import { dataset } from "@/lib/live/dataset";
import { buildLandscapeSummary } from "@/lib/media-landscape/dashboard";
import { LandscapeDashboard } from "@/components/media/landscape-dashboard";
import { allDistricts } from "@/lib/live/dataset";

export const metadata: Metadata = {
  title: "Tamil Nadu media landscape",
  description: "How Tamil Nadu news is being covered — district coverage, Tamil vs English attention, under-covered districts, entities, and asymmetry.",
};

const TN_DISTRICTS = [
  "Ariyalur","Chengalpattu","Chennai","Coimbatore","Cuddalore","Dharmapuri","Dindigul","Erode","Kallakurichi","Kancheepuram","Kanyakumari","Karur","Krishnagiri","Madurai","Mayiladuthurai","Nagapattinam","Namakkal","Nilgiris","Perambalur","Pudukkottai","Ramanathapuram","Ranipet","Salem","Sivaganga","Tenkasi","Thanjavur","Theni","Thoothukudi","Tiruchirappalli","Tirunelveli","Tirupathur","Tiruppur","Tiruvallur","Tiruvannamalai","Tiruvarur","Vellore","Viluppuram","Virudhunagar",
];

export default function TamilNaduLandscapePage() {
  const s = buildLandscapeSummary(dataset, { tnOnly: true });

  const districtCoverage = new Map<string, number>();
  for (const c of dataset.clusters) {
    if (!(c.scope === "tamil-nadu" || c.trendData?.geoTier === "P0")) continue;
    for (const d of c.districts) districtCoverage.set(d, (districtCoverage.get(d) ?? 0) + 1);
  }
  const covered = [...districtCoverage.entries()].sort((a, b) => b[1] - a[1]);
  const seen = new Set(covered.map(([d]) => d.toLowerCase()));
  const underCovered = TN_DISTRICTS.filter((d) => !seen.has(d.toLowerCase()) && !seen.has(d.toLowerCase().replace(/pathur$/, "pattur")));

  return (
    <div className="min-w-0 pb-8">
      <header className="border-b-2 border-ink/80 pb-4">
        <div className="label">Tamil Nadu · media landscape</div>
        <h1 className="mt-1 font-serif text-[27px] font-semibold leading-tight sm:text-[33px]">
          Tamil Nadu media landscape
        </h1>
        <p className="ui mt-1.5 max-w-2xl text-[13px] leading-relaxed text-ink-3">
          District-level attention, Tamil vs English coverage, under-covered districts, and where
          coverage of the state is asymmetric.
        </p>
      </header>

      <section className="mt-6">
        <div className="label mb-1.5 text-[10px]">District coverage (this snapshot)</div>
        {covered.length ? (
          <div className="flex flex-wrap gap-1.5">
            {covered.map(([d, n]) => (
              <span key={d} className="pill bg-surface-2 ui text-[12px] text-ink-2">
                {d} <span className="mono text-ink-3">{n}</span>
              </span>
            ))}
          </div>
        ) : (
          <p className="ui text-[12.5px] text-ink-3">No district-tagged Tamil Nadu story in this snapshot.</p>
        )}
        {underCovered.length > 0 && (
          <>
            <div className="label mb-1.5 mt-4 text-[10px]">Under-covered districts (no story this snapshot)</div>
            <p className="ui text-[12px] leading-relaxed text-ink-3">{underCovered.join(" · ")}</p>
          </>
        )}
        <p className="ui mt-3 text-[11px] text-ink-3">
          A district with no story right now is a fact about <em>coverage in this snapshot</em>, not about whether
          anything is happening there. See every district on <Link href="/tamil-nadu" className="text-accent hover:underline">the Tamil Nadu page</Link>.
          {allDistricts().length > 0 && ` Districts active in this refresh: ${allDistricts().length}.`}
        </p>
      </section>

      <div className="mt-8">
        <LandscapeDashboard s={s} scope="Tamil Nadu" />
      </div>
    </div>
  );
}
