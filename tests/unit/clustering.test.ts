import { describe, expect, it } from "vitest";
import { HeuristicClustering, similarityBreakdown, type ClusterEvent } from "@/lib/clustering";

const clustering = new HeuristicClustering();

const existing: ClusterEvent = {
  id: "evt_1",
  title: "National Assembly introduces draft AI oversight bill",
  representativeText:
    "The National Assembly introduced the AI Systems Oversight Bill creating a registration duty and a supervisory unit inside the Ministry of Digital Affairs.",
  entities: ["National Assembly", "AI Systems Oversight Bill", "Ministry of Digital Affairs"],
  startedAt: new Date("2026-03-01T09:00:00Z"),
  latestUpdateAt: new Date("2026-03-01T15:00:00Z"),
};

describe("similarityBreakdown", () => {
  it("returns component scores in [0,1] and a blended score", () => {
    const b = similarityBreakdown(
      { title: "AI oversight bill introduced", text: "the bill introduced", publishedAt: new Date("2026-03-01T10:00:00Z"), entities: ["AI Systems Oversight Bill"] },
      { title: existing.title, text: existing.representativeText, publishedAt: existing.latestUpdateAt, entities: existing.entities },
    );
    for (const v of [b.title, b.entity, b.keyword, b.temporal, b.score]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("HeuristicClustering.assign", () => {
  it("joins an article that clearly covers the same event", () => {
    const assignment = clustering.assign(
      {
        title: "AI oversight bill enters the Assembly: what the text says",
        text: "Lawmakers began considering the AI Systems Oversight Bill after the National Assembly introduced the measure. It creates a supervisory unit within the Ministry of Digital Affairs.",
        publishedAt: new Date("2026-03-01T12:00:00Z"),
        entities: ["National Assembly", "AI Systems Oversight Bill", "Ministry of Digital Affairs"],
      },
      [existing],
    );
    expect(assignment.eventId).toBe("evt_1");
    expect(assignment.similarity).toBeGreaterThanOrEqual(clustering.joinThreshold);
  });

  it("creates a new event for an unrelated article", () => {
    const assignment = clustering.assign(
      {
        title: "Coastal flood barriers planned for the Kestrel shoreline",
        text: "The Ministry of Infrastructure published a plan to build flood barriers along forty kilometres of coast.",
        publishedAt: new Date("2026-03-01T12:00:00Z"),
        entities: ["Ministry of Infrastructure", "Kestrel coast"],
      },
      [existing],
    );
    expect(assignment.eventId).toBeNull();
  });

  it("does not join on temporal proximity alone", () => {
    const assignment = clustering.assign(
      {
        title: "Reserve Bank holds benchmark rate at 3.75 percent",
        text: "The Monetary Policy Committee kept the benchmark rate unchanged.",
        publishedAt: existing.latestUpdateAt,
        entities: ["Reserve Bank", "Monetary Policy Committee"],
      },
      [existing],
    );
    expect(assignment.eventId).toBeNull();
  });
});
