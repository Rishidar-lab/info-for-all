/**
 * Milestone B §B.2 — primary-record research types.
 *
 * A `PrimaryRecord` is a document from an official / court / data source that
 * IFFA has retrieved (or already holds in its corpus) and can re-verify from
 * stored bytes. It is a **primary anchor**, never an "independent newsroom"
 * (§B.1 established this and §B.2 must not regress it).
 */
export type RecordTier = "primary_official" | "primary_court" | "primary_data" | "verified_factcheck";

export interface RawRecord {
  /** sha256 of the raw response bytes. A record that cannot be re-derived from these is not a record. */
  sha256: string;
  url: string;
  fetchedAt: string;
  contentType: string;
  /** Raw bytes, base64 — persisted so the whole research path replays offline in CI. */
  bytesB64: string;
}

export interface PrimaryRecord {
  id: string;
  adapter: string;
  tier: RecordTier;
  authority: string;
  title: string;
  /** Full document text when available; the title when only a listing/RSS entry was reachable. */
  text: string;
  /** False when only a headline/listing entry could be retrieved (e.g. PIB body behind a bot-wall). */
  bodyAvailable: boolean;
  publishedAt: string;
  url: string;
  sha256: string;
  fetchedAt: string;
  /** Set when the record is a scanned image that was OCR'd. */
  requiresOcr?: boolean;
  /** null until a human confirms the OCR — a record with requiresOcr and no confirmed confidence CANNOT anchor a published claim. */
  ocrConfidence?: number | null;
}

export type ClaimMatchOutcome = "corroborated" | "contradicted" | "not_found";

export interface ClaimMatch {
  claimId: string;
  claimText: string;
  recordId: string;
  outcome: ClaimMatchOutcome;
  /** For `corroborated` — the record locator (char offset range into `record.text`). Stored, not recomputed at render. */
  locator?: { start: number; end: number };
  /** For `contradicted` — what the record says vs what the reporting says. */
  conflict?: { field: string; reportingValue: string; recordValue: string };
  reason: string;
}

export interface ResearchQuery {
  claimId: string;
  claimType: string;
  entities: string[];
  numbers: string[];
  dates: string[];
  places: string[];
  authority: string | null;
}

/** The research result for one cluster — read by the brief layer, committed for CI replay. */
export interface ClusterResearch {
  slug: string;
  generatedAt: string;
  /** Adapters actually queried (for the withhold-reason trail). */
  checkedAdapters: string[];
  /** Human-readable names of the sources checked, for "we checked N official sources". */
  checkedSources: string[];
  records: PrimaryRecord[];
  matches: ClaimMatch[];
  /** True when the trigger fired but nothing corroborating was found. */
  exhausted: boolean;
}

export interface RecordCandidate {
  adapter: string;
  externalId: string;
  title: string;
  publishedAt: string;
  url: string;
  /** 0–1 lexical relevance to the query — deterministic. */
  relevance: number;
}

export interface RecordAdapter {
  id: string;
  /** Independence family key — NEVER "independent". */
  family: string;
  tier: RecordTier;
  /** True when this adapter needs the network (skipped when RESEARCH_OFFLINE and no fixture). */
  network: boolean;
  search(q: ResearchQuery, ctx: AdapterContext): Promise<RecordCandidate[]>;
  fetch(externalId: string, ctx: AdapterContext): Promise<RawRecord | null>;
  parse(raw: RawRecord): PrimaryRecord | null;
}

export interface AdapterContext {
  /** Existing official articles already in the corpus (for corpus_official). */
  corpusOfficialArticles: {
    id: string;
    publisher: string;
    title: string;
    excerpt: string;
    url: string;
    publishedAt: string;
    evidenceRole: string;
  }[];
  /** When true, adapters use only committed fixtures — no network. CI sets this. */
  offline: boolean;
  /** Directory holding committed raw-byte fixtures, keyed by sha256. */
  fixtureDir: string;
  now: number;
}
