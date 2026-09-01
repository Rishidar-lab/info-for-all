import { describe, expect, it } from "vitest";
import { computeIndependence, type IndependenceArticle } from "@/lib/independence";

const at = (h: number) => new Date(Date.now() - h * 3600_000);

describe("computeIndependence", () => {
  it("collapses articles sharing an ownership group", () => {
    const articles: IndependenceArticle[] = [
      { id: "a", publication: "Meridian", sourceDomain: "meridian.example", ownershipGroup: "Anchorline", parentCompany: "Anchorline", publishedAt: at(3), text: "unique text one" },
      { id: "b", publication: "Vanguard", sourceDomain: "vanguard.example", ownershipGroup: "Anchorline", parentCompany: "Anchorline", publishedAt: at(2), text: "unique text two" },
      { id: "c", publication: "Northwind", sourceDomain: "northwind.example", ownershipGroup: "Northwind", parentCompany: null, publishedAt: at(1), text: "unique text three" },
    ];
    const report = computeIndependence(articles);
    expect(report.totalArticles).toBe(3);
    expect(report.independentCount).toBe(2);
    expect(report.ownershipGroups).toContain("Anchorline");
  });

  it("collapses articles carrying the same wire service", () => {
    const articles: IndependenceArticle[] = [
      { id: "w1", publication: "Harbor Post", sourceDomain: "harbor.example", wireService: "Transregional Newswire", publishedAt: at(4), text: "wire body A" },
      { id: "w2", publication: "Civic Review", sourceDomain: "civic.example", wireService: "Transregional Newswire", publishedAt: at(3), text: "wire body B" },
      { id: "o", publication: "Signalpost", sourceDomain: "signalpost.example", publishedAt: at(1), text: "independent analysis with different wording entirely" },
    ];
    const report = computeIndependence(articles);
    expect(report.independentCount).toBe(2);
    expect(report.wireDependentArticles).toBe(1);
  });

  it("collapses near-duplicate body text", () => {
    const shared =
      "The National Assembly introduced the AI Systems Oversight Bill on Monday, opening debate on the country's first dedicated legislation for artificial intelligence.";
    const articles: IndependenceArticle[] = [
      { id: "d1", publication: "Wire", sourceDomain: "wire.example", publishedAt: at(3), text: shared },
      { id: "d2", publication: "Reprinter", sourceDomain: "reprint.example", publishedAt: at(2), text: shared },
    ];
    const report = computeIndependence(articles);
    expect(report.independentCount).toBe(1);
    expect(report.duplicateTextPairs).toBeGreaterThanOrEqual(1);
  });

  it("assigns discount weights of 1/clusterSize", () => {
    const articles: IndependenceArticle[] = [
      { id: "x", publication: "A", sourceDomain: "a.example", ownershipGroup: "G", parentCompany: "G", publishedAt: at(2), text: "one" },
      { id: "y", publication: "B", sourceDomain: "b.example", ownershipGroup: "G", parentCompany: "G", publishedAt: at(1), text: "two" },
    ];
    const report = computeIndependence(articles);
    expect(report.weights.x).toBeCloseTo(0.5);
    expect(report.weights.y).toBeCloseTo(0.5);
  });
});
