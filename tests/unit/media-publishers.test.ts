import { describe, it, expect } from "vitest";
import { PUBLISHERS, publisherByName, publisherSlug } from "@/data/publishers";
import { describePublisher, allPublisherProfiles, buildSourceFamilies, familyIndex } from "@/lib/media-landscape/publishers";
import { sampleBand, SAMPLE_BANDS } from "@/lib/media-landscape/alignment";
import { FEED_SOURCES } from "@/data/feeds";

describe("media landscape — publisher / ownership registry (v0.10 Phase 1)", () => {
  it("every publisher IFFA ingests has a registry entry", () => {
    const feedPubs = [...new Set(FEED_SOURCES.map((f) => f.publisher))];
    const missing = feedPubs.filter((p) => !publisherByName(p));
    expect(missing).toEqual([]);
  });

  it("every ownership assertion carries provenance with a verifiedAt + confidence", () => {
    for (const p of PUBLISHERS) {
      expect(p.ownership.provenance.source.length).toBeGreaterThan(10);
      expect(p.ownership.provenance.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["high", "moderate", "low"]).toContain(p.ownership.provenance.confidence);
    }
  });

  it("UNKNOWN ownership is allowed and is used where the fact is not verified", () => {
    const ptm = publisherByName("Puthiyathalaimurai")!;
    expect(ptm.ownership.category).toBe("UNKNOWN");
    expect(ptm.ownership.provenance.confidence).toBe("low");
  });

  it("no publisher carries an unattributed / invented external rating", () => {
    for (const p of PUBLISHERS) {
      for (const r of p.externalRatings) {
        expect(r.provider.length).toBeGreaterThan(2);
        expect(r.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
    }
  });

  it("describePublisher merges registry + feed data", () => {
    const hindu = describePublisher("The Hindu");
    expect(hindu.id).toBe("the-hindu");
    expect(hindu.ownership.category).toBe("MEDIA_CONGLOMERATE");
    expect(hindu.ownership.parent).toBe("Kasturi & Sons Ltd");
    expect(hindu.sourceFamilyId).toBe("kasturi-and-sons");
    expect(hindu.languages).toContain("en");
  });

  it("an unknown publisher degrades to UNKNOWN ownership, never inferred", () => {
    const p = describePublisher("Some Random Blog That Does Not Exist");
    expect(p.ownership.category).toBe("UNKNOWN");
    expect(p.ownership.provenance.note).toMatch(/does not infer/i);
  });

  it("source families group same-owner publishers", () => {
    const fams = buildSourceFamilies();
    const kasturi = fams.find((f) => f.id === "kasturi-and-sons")!;
    expect(kasturi.publisherIds).toEqual(expect.arrayContaining(["the-hindu", "the-hindu-businessline", "sportstar"]));
    const idx = familyIndex();
    expect(idx.get("The Hindu")).toBe(idx.get("Sportstar"));
    expect(idx.get("The Hindu")).not.toBe(idx.get("The Times of India"));
  });

  it("all 17+ enabled publishers profile without throwing", () => {
    const profiles = allPublisherProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(17);
    for (const p of profiles) expect(p.name.length).toBeGreaterThan(1);
  });

  it("sample bands: <20 insufficient, 20–49 low, 50–149 moderate, 150+ substantial", () => {
    expect(sampleBand(0)).toBe("INSUFFICIENT");
    expect(sampleBand(19)).toBe("INSUFFICIENT");
    expect(sampleBand(20)).toBe("LOW_CONFIDENCE");
    expect(sampleBand(49)).toBe("LOW_CONFIDENCE");
    expect(sampleBand(50)).toBe("MODERATE_SAMPLE");
    expect(sampleBand(149)).toBe("MODERATE_SAMPLE");
    expect(sampleBand(150)).toBe("SUBSTANTIAL_SAMPLE");
    expect(SAMPLE_BANDS).toHaveLength(4);
  });

  it("publisherSlug is stable and url-safe", () => {
    expect(publisherSlug("The Hindu")).toBe("the-hindu");
    expect(publisherSlug("Kasturi & Sons")).toBe("kasturi-and-sons");
    expect(publisherSlug("Some Weird Name!!")).toBe("some-weird-name");
  });
});
