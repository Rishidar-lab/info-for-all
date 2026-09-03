/**
 * §B.2 record adapters — by the §B.2.0 profile + a 2026-09-03 fetchability probe
 * (see IFFA_MILESTONE_B2_REPORT.md §B.2.2).
 *
 * SHIPPED:
 *   corpus_official   — links an official article ALREADY in IFFA's corpus
 *                       (RBI, NDMA SACHET, IMD) to a withheld news cluster. No
 *                       network. Highest yield.
 *   tn_dipr_listing   — the TN DIPR listing (identifying UA accepted). Releases
 *                       are JPG scans; records are requiresOcr / ocrConfidence:
 *                       null and can NEVER anchor a published claim without a
 *                       human confirm. Value: the withhold-reason upgrade.
 *
 * NOT SHIPPED — `pib_rss` (file kept, `parsePibRss` tested): PIB's Akamai layer
 * 403s ANY User-Agent containing "IFFA" or "bot", on every path including the
 * RSS. The only way through is a bare browser UA, which reads as evasion and is
 * against I2 / §B.2.2. Left as a maintainer UA-policy / partnership decision (§9).
 *
 * DEFERRED FOR CAUSE: tn_gazette (G.O. PDFs, low applicability), ecourts (CAPTCHA
 * + needs a case number), district_collectorate (27 sites), data_gov_in
 * (datasets, low news-match), eci_tn_ceo, imd_rmc (RSS retired, API 401-gated).
 */
import type { RecordAdapter } from "../types";
import { corpusOfficialAdapter } from "./corpus-official";
import { tnDiprListingAdapter } from "./tn-dipr-listing";

export const ADAPTERS: RecordAdapter[] = [corpusOfficialAdapter, tnDiprListingAdapter];

export { corpusOfficialAdapter, tnDiprListingAdapter };
export { pibRssAdapter, parsePibRss } from "./pib-rss";
