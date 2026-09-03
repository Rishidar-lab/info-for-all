/**
 * Hardened source-family resolver (Milestone B, §B.1).
 *
 * "How many GENUINELY INDEPENDENT newsrooms actually reported this?" — the
 * question the brief withholding gate depends on. Two mastheads of one group are
 * one family; every pickup of one wire dispatch is one family; a set of articles
 * that all echo one press release is one family; a syndicated repost with the
 * credit stripped is caught by body-shingle overlap.
 *
 * WHY THIS IS A NEW MODULE, NOT `src/lib/independence/`:
 * `src/lib/independence/` is part of the FROZEN v0.6 claim engine (byte-identical
 * vs v0.10.0 is a release gate). This resolver sits OUTSIDE it, reads its output
 * plus the full publisher registry, and produces the stricter family picture the
 * brief layer uses. The frozen engine keeps feeding the claim pipeline unchanged.
 *
 * DETERMINISTIC. No model. Conservative: when two articles cannot be told apart
 * as independent OR syndicated, they stay separate (the frozen engine's rule).
 */
import type { LiveArticle } from "@/lib/live/types";
import type { Evidence } from "@/lib/claims/types";
import { FEED_SOURCES } from "@/data/feeds";
import { publisherByName } from "@/data/publishers";
import { detectWireCredit } from "@/lib/independence/wire";

export type FamilyKind =
  | "independent" // ≥1 member did its own reporting (has body text, no wire credit, not a PR echo)
  | "official-primary" // ≥1 member is an official alert / primary document / government statement
  | "wire" // every member carries the same wire-agency credit
  | "press-release-echo" // every member closely echoes an official record in this cluster
  | "syndication" // merged in on ≥85% body-shingle overlap
  | "thin"; // short headline only — cannot classify

export interface ResolvedFamily {
  id: string;
  kind: FamilyKind;
  publisherIds: string[];
  articleIds: string[];
  /** Human-readable justification. */
  basis: string;
  wireAgency?: string;
}

export interface SourceFamilyResolution {
  families: ResolvedFamily[];
  familyCount: number;
  /** Families of kind "independent" — the "two independent newsrooms" bar. */
  genuineIndependentFamilies: number;
  /** Official alerts / primary records present — a valid single-source anchor. */
  primaryRecordCount: number;
  /** Merges applied beyond the registry, for the reader-facing explanation. */
  downgrades: { publishers: string[]; into: FamilyKind; reason: string }[];
  wireAgencies: string[];
  /** One-line summary for a badge. */
  label: string;
}

const OFFICIAL_ROLES = new Set(["official-alert", "primary-document", "government-statement"]);

const feedOwnershipGroup = new Map<string, string>();
for (const f of FEED_SOURCES) if (f.ownershipGroup) feedOwnershipGroup.set(f.publisher, f.ownershipGroup);

/** Registry family key for a publisher (full registry, not the frozen 5-entry map). */
function registryKey(publisher: string): string {
  const p = publisherByName(publisher);
  if (p) return `reg:${p.familyKey}`;
  const og = feedOwnershipGroup.get(publisher);
  if (og) return `og:${og}`;
  return `pub:${publisher}`;
}

function norm(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
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

function sentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 20);
}

/** How much of `article` reads like `record` (0–1). */
function echoScore(articleText: string, recordText: string): number {
  const rs = sentences(recordText);
  if (rs.length === 0) return 0;
  const at = new Set(norm(articleText));
  let matched = 0;
  for (const s of rs) {
    const st = norm(s).filter((w) => w.length > 3);
    if (st.length === 0) continue;
    const hit = st.filter((w) => at.has(w)).length / st.length;
    if (hit >= 0.6) matched++;
  }
  return matched / rs.length;
}

class UnionFind {
  private parent = new Map<string, string>();
  add(x: string) {
    if (!this.parent.has(x)) this.parent.set(x, x);
  }
  find(x: string): string {
    let r = x;
    while (this.parent.get(r) !== r) r = this.parent.get(r)!;
    let c = x;
    while (this.parent.get(c) !== r) {
      const next = this.parent.get(c)!;
      this.parent.set(c, r);
      c = next;
    }
    return r;
  }
  union(a: string, b: string) {
    this.add(a);
    this.add(b);
    this.parent.set(this.find(a), this.find(b));
  }
}

export function resolveSourceFamilies(
  articles: LiveArticle[],
  opts: { evidence?: Evidence[] } = {},
): SourceFamilyResolution {
  const uf = new UnionFind();
  for (const a of articles) uf.add(a.id);

  const textOf = (a: LiveArticle) => `${a.title} ${a.excerpt ?? ""}`.trim();
  const wireOf = new Map<string, string | undefined>();
  const echoOf = new Map<string, boolean>();
  const downgrades: SourceFamilyResolution["downgrades"] = [];

  // 1. same registry family / ownership group
  const byRegKey = new Map<string, string[]>();
  for (const a of articles) {
    const k = registryKey(a.publisher);
    (byRegKey.get(k) ?? byRegKey.set(k, []).get(k)!).push(a.id);
  }
  for (const [k, ids] of byRegKey) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
    const pubs = [...new Set(ids.map((id) => articles.find((a) => a.id === id)!.publisher))];
    if (pubs.length > 1) downgrades.push({ publishers: pubs, into: "independent", reason: `shared corporate family (${k.replace(/^(reg|og|pub):/, "")})` });
  }

  // 2. same wire agency — every pickup of one dispatch is one family, always
  const byWire = new Map<string, string[]>();
  for (const a of articles) {
    const w = detectWireCredit(textOf(a));
    wireOf.set(a.id, w);
    if (w) (byWire.get(w) ?? byWire.set(w, []).get(w)!).push(a.id);
  }
  for (const [agency, ids] of byWire) {
    for (let i = 1; i < ids.length; i++) uf.union(ids[0], ids[i]);
    if (ids.length > 1) {
      const pubs = [...new Set(ids.map((id) => articles.find((a) => a.id === id)!.publisher))];
      downgrades.push({ publishers: pubs, into: "wire", reason: `all carry a ${agency} credit — one dispatch` });
    }
  }

  // 3. body-shingle overlap ≥ 0.85 (5-gram Jaccard) — syndicated repost.
  // Compare the excerpt (the closest thing to a body we ingest) when both have a
  // substantive one; otherwise the headline+excerpt. NOTE: we do not ingest full
  // article bodies, so this fires only on the short text available — see the
  // §B.1 report for the limitation.
  const bodyShOf = new Map<string, Set<string>>();
  const combShOf = new Map<string, Set<string>>();
  for (const a of articles) {
    bodyShOf.set(a.id, shingles(norm((a.excerpt ?? "").trim()), 5));
    combShOf.set(a.id, shingles(norm(textOf(a)), 5));
  }
  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      const A = articles[i];
      const B = articles[j];
      if (uf.find(A.id) === uf.find(B.id)) continue;
      const bothBody = (A.excerpt ?? "").trim().length >= 30 && (B.excerpt ?? "").trim().length >= 30;
      const jac = bothBody
        ? Math.max(jaccard(bodyShOf.get(A.id)!, bodyShOf.get(B.id)!), jaccard(combShOf.get(A.id)!, combShOf.get(B.id)!))
        : jaccard(combShOf.get(A.id)!, combShOf.get(B.id)!);
      if (jac >= 0.85) {
        uf.union(A.id, B.id);
        downgrades.push({ publishers: [A.publisher, B.publisher], into: "syndication", reason: `${(jac * 100).toFixed(0)}% verbatim overlap — one copy` });
      }
    }
  }

  // 4. press-release echo — articles that all closely echo the same official record
  const officialArticles = articles.filter((a) => OFFICIAL_ROLES.has(a.evidenceRole) || a.role === "official");
  const records: { id: string; text: string; day: string }[] = [
    ...officialArticles.map((a) => ({ id: a.id, text: textOf(a), day: (a.publishedAt || "").slice(0, 10) })),
    ...(opts.evidence ?? []).map((e) => ({ id: e.id, text: `${e.title} ${String(e.provenance.event ?? "")}`, day: (e.publishedAt ?? "").slice(0, 10) })),
  ];
  for (const a of articles) {
    if (OFFICIAL_ROLES.has(a.evidenceRole) || a.role === "official") continue;
    const day = (a.publishedAt || "").slice(0, 10);
    const echo = records.some((r) => (!r.day || !day || r.day === day) && echoScore(textOf(a), r.text) >= 0.6);
    echoOf.set(a.id, echo);
  }

  // ── assemble families ──────────────────────────────────────────────────
  const byRoot = new Map<string, string[]>();
  for (const a of articles) {
    const r = uf.find(a.id);
    (byRoot.get(r) ?? byRoot.set(r, []).get(r)!).push(a.id);
  }

  const families: ResolvedFamily[] = [...byRoot.values()].map((ids, idx) => {
    const arts = ids.map((id) => articles.find((a) => a.id === id)!);
    const pubs = [...new Set(arts.map((a) => a.publisher))];
    const wires = [...new Set(arts.map((a) => wireOf.get(a.id)).filter(Boolean))] as string[];
    const hasOfficial = arts.some((a) => OFFICIAL_ROLES.has(a.evidenceRole) || a.role === "official");
    const allEcho = arts.length > 0 && arts.every((a) => echoOf.get(a.id));
    const allWire = arts.length > 0 && arts.every((a) => wireOf.get(a.id)) && wires.length === 1;
    // The DEFAULT for a distinct newsroom is "independent". Downgrade only on
    // positive evidence of non-independence (a shared family / wire / PR echo).
    // "thin" is reserved for the genuinely unknowable: an unregistered outlet
    // with a headline and nothing else.
    const registered = arts.some((a) => !!publisherByName(a.publisher) || feedOwnershipGroup.has(a.publisher));
    const hasAnyExcerpt = arts.some((a) => (a.excerpt ?? "").trim().length >= 15);

    let kind: FamilyKind;
    let basis: string;
    if (hasOfficial) {
      kind = "official-primary";
      basis = `official / primary record (${pubs.join(", ")})`;
    } else if (allWire) {
      kind = "wire";
      basis = `${wires[0]} dispatch, reprinted by ${pubs.join(", ")}`;
    } else if (allEcho) {
      kind = "press-release-echo";
      basis = `echoes an official record — ${pubs.join(", ")}`;
    } else if (registered || hasAnyExcerpt) {
      kind = "independent";
      basis = pubs.length > 1 ? `one corporate family (${pubs.join(", ")})` : pubs[0];
    } else {
      kind = "thin";
      basis = `${pubs.join(", ")} — headline only, independence unclear`;
    }
    return {
      id: `fam${idx + 1}`,
      kind,
      publisherIds: pubs,
      articleIds: ids,
      basis,
      wireAgency: wires[0],
    };
  });

  const genuineIndependentFamilies = families.filter((f) => f.kind === "independent").length;
  const primaryRecordCount =
    families.filter((f) => f.kind === "official-primary").length + (opts.evidence?.length ?? 0);
  const wireAgencies = [...new Set(families.map((f) => f.wireAgency).filter(Boolean))] as string[];

  const label =
    genuineIndependentFamilies >= 3
      ? "Multiple independent newsrooms"
      : genuineIndependentFamilies === 2
        ? "Two independent newsrooms"
        : primaryRecordCount >= 1 && genuineIndependentFamilies <= 1
          ? "Official record, limited independent reporting"
          : genuineIndependentFamilies === 1
            ? "One newsroom"
            : families.some((f) => f.kind === "wire" || f.kind === "syndication")
              ? "One dispatch, reprinted"
              : "Independence unclear";

  return {
    families,
    familyCount: families.length,
    genuineIndependentFamilies,
    primaryRecordCount,
    downgrades: dedupeDowngrades(downgrades),
    wireAgencies,
    label,
  };
}

function dedupeDowngrades(d: SourceFamilyResolution["downgrades"]): SourceFamilyResolution["downgrades"] {
  const seen = new Set<string>();
  const out: SourceFamilyResolution["downgrades"] = [];
  for (const x of d) {
    const k = `${x.into}:${[...x.publishers].sort().join("|")}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}
