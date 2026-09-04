/**
 * Independence resolution over discovered coverage.
 *
 * After a candidate passes SAME-EVENT identity, this decides whether it is a
 * GENUINELY INDEPENDENT newsroom or a wire copy / corporate sibling / verbatim
 * repost / official record. Only `independent` reports whose family key is not
 * already on the story raise the reader-facing independent-family count.
 *
 * This mirrors the philosophy of `src/lib/research/independence.ts` (URL count ≠
 * independent confirmation) but works on discovery metadata, not `LiveArticle`s.
 */
import type { LiveArticle } from "@/lib/live/types";
import { detectLanguage } from "@/lib/live/text";
import { candidateWire } from "./dedupe";
import { resolveOutlet } from "./publisher-resolve";
import type {
  CandidateMatch,
  DiscoveredReport,
  DiscoveredSourceType,
  DiscoveryCandidate,
} from "./types";

function norm(t: string): string[] {
  return t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
}
function shingles(tokens: string[], n: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + n <= tokens.length; i++) out.add(tokens.slice(i, i + n).join(" "));
  return out;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

const OFFICIAL_FAMILY = /^govt-india|^prasar-bharati$|^un-ocha$|^wire-/;

/** Seed keys arrive as `reg:<family>` / `og:<group>` / `pub:<name>` (pipeline
 * helper); outlet keys are bare family keys. Compare the bare family on both
 * sides so a corporate sibling can never read as a new independent family. */
function bareFamilyKey(k: string): string {
  return k.replace(/^(reg|og|pub|domain):/, "").toLowerCase().trim();
}

/**
 * @param seedArticles articles already on the story (their families are "known")
 * @param seedFamilyKeys registry/ownership family keys already on the story
 */
export function resolveDiscoveredReports(
  matched: { candidate: DiscoveryCandidate; match: CandidateMatch }[],
  seedArticles: LiveArticle[],
  seedFamilyKeys: Set<string>,
  knownGenuineFamiliesBefore: number,
): {
  reports: DiscoveredReport[];
  familiesBefore: number;
  familiesAfter: number;
  rescued: boolean;
  rescueLanguages: string[];
} {
  const seedLangs = new Set(seedArticles.map((a) => a.language).filter((l) => l !== "unknown"));
  const reports: DiscoveredReport[] = [];
  const bareSeedFamilies = new Set([...seedFamilyKeys].map(bareFamilyKey));

  // verbatim-repost detection among the matched candidates themselves
  const shOf = matched.map((m) => shingles(norm(`${m.candidate.title} ${m.candidate.snippet ?? ""}`), 5));

  const newIndependentFamilies = new Set<string>();
  const rescueLanguages = new Set<string>();

  for (let i = 0; i < matched.length; i++) {
    const { candidate, match } = matched[i];
    const outlet = resolveOutlet(candidate.source, candidate.domain);
    const language =
      candidate.language ?? outlet.language ?? detectLanguage(`${candidate.title} ${candidate.snippet ?? ""}`);

    let sourceType: DiscoveredSourceType;
    const wire = candidateWire(candidate);
    if (wire) {
      sourceType = "wire";
    } else if (OFFICIAL_FAMILY.test(outlet.familyKey) || outlet.type === "official" || outlet.type === "wire-agency") {
      sourceType = outlet.type === "wire-agency" ? "wire" : "official-primary";
    } else if (bareSeedFamilies.has(bareFamilyKey(outlet.familyKey))) {
      sourceType = "same-family";
    } else if (
      shOf.slice(0, i).some((s) => jaccard(s, shOf[i]) >= 0.85)
    ) {
      sourceType = "syndication";
    } else if (!outlet.registered && outlet.type === "unknown") {
      sourceType = "unregistered";
    } else {
      sourceType = "independent";
    }

    reports.push({
      canonicalUrl: candidate.canonicalUrl,
      title: candidate.title,
      publisher: outlet.name,
      publisherId: outlet.publisherId,
      registered: outlet.registered,
      language,
      publishedAt: candidate.publishedAt,
      familyKey: outlet.familyKey,
      sourceType,
      match,
      provider: candidate.provider,
      query: candidate.query,
      discoveredAt: candidate.discoveredAt,
    });

    if (sourceType === "independent" && !bareSeedFamilies.has(bareFamilyKey(outlet.familyKey)) && !newIndependentFamilies.has(outlet.familyKey)) {
      newIndependentFamilies.add(outlet.familyKey);
      // cross-language rescue direction
      const seedLang = [...seedLangs][0] ?? "en";
      if (language !== "unknown") rescueLanguages.add(`${seedLang}->${language}`);
    }
  }

  const familiesBefore = Math.max(knownGenuineFamiliesBefore, seedFamilyKeys.size ? [...seedFamilyKeys].map(bareFamilyKey).filter((k) => !OFFICIAL_FAMILY.test(k)).length : knownGenuineFamiliesBefore);
  const familiesAfter = familiesBefore + newIndependentFamilies.size;
  const rescued = familiesBefore <= 1 && familiesAfter >= 2;

  return {
    reports,
    familiesBefore,
    familiesAfter,
    rescued,
    rescueLanguages: [...rescueLanguages],
  };
}
