/**
 * Sample-size discipline for observed editorial alignment (v0.10).
 *
 * IFFA never assigns a meaningful source alignment on weak evidence, and never
 * displays pseudo-precision. Below the minimum, alignment is withheld and the UI
 * shows "INSUFFICIENT DATA". The thresholds are documented here and adjustable.
 *
 * The rolling per-publisher × per-entity alignment computation is built in
 * Phase 5 (./observed-alignment.ts) once the historical store has enough days.
 */
import type { SampleBand, SampleContext } from "./types";

/** n < min → the band. Documented + adjustable. */
export const SAMPLE_BANDS: { band: SampleBand; min: number; label: string }[] = [
  { band: "INSUFFICIENT", min: 0, label: "Insufficient data" },
  { band: "LOW_CONFIDENCE", min: 20, label: "Low confidence" },
  { band: "MODERATE_SAMPLE", min: 50, label: "Moderate sample" },
  { band: "SUBSTANTIAL_SAMPLE", min: 150, label: "Substantial sample" },
];

export function sampleBand(n: number): SampleBand {
  let band: SampleBand = "INSUFFICIENT";
  for (const b of SAMPLE_BANDS) if (n >= b.min) band = b.band;
  return band;
}

export function sampleBandLabel(band: SampleBand): string {
  return SAMPLE_BANDS.find((b) => b.band === band)?.label ?? "Insufficient data";
}

/** Below this, alignment is not shown at all. */
export const MIN_SAMPLE_FOR_ALIGNMENT = 20;

export function makeSampleContext(n: number, window: SampleContext["window"], computedAt: string): SampleContext {
  return { n, band: sampleBand(n), window, computedAt };
}

/** True when an alignment observation has enough behind it to display. */
export function alignmentIsDisplayable(sample: SampleContext): boolean {
  return sample.n >= MIN_SAMPLE_FOR_ALIGNMENT;
}
