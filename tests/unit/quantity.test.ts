import { describe, it, expect } from "vitest";
import {
  parseQuantities,
  quantitiesEquivalent,
  parseNumberToken,
} from "@/lib/claims/quantity";

describe("quantity normalisation (Phase 11)", () => {
  it("normalises rainfall length units to mm", () => {
    const a = parseQuantities("Chennai received 120 mm of rain");
    const b = parseQuantities("Chennai recorded 12 cm of rainfall");
    expect(a[0]?.value).toBe(120);
    expect(b[0]?.value).toBe(120);
    expect(a[0]?.dimension).toBe("length");
  });

  it("treats 120 mm and 12 cm as the same magnitude", () => {
    expect(quantitiesEquivalent("120 mm of rain", "12 cm of rainfall")).toBe(true);
    expect(quantitiesEquivalent("65 mm of rain", "140 mm of rain")).toBe(false);
  });

  it("normalises Indian currency scales", () => {
    const crore = parseQuantities("Rs 500 crore relief package");
    const billion = parseQuantities("Rs 5 billion for flood relief");
    expect(crore[0]?.value).toBe(5_000_000_000);
    expect(billion[0]?.value).toBe(5_000_000_000);
    expect(quantitiesEquivalent("Rs 500 crore", "Rs 5 billion")).toBe(true);
  });

  it("handles spelled and colloquial counts", () => {
    expect(parseNumberToken("three")).toBe(3);
    expect(parseNumberToken("a")).toBe(1);
    expect(parseNumberToken("12,000")).toBe(12000);
    const half = parseQuantities("half a lakh people shifted");
    expect(half[0]?.value).toBe(50000);
  });

  it("does NOT convert across dimensions", () => {
    expect(quantitiesEquivalent("90 kmph winds", "90 mm rain")).toBe(false);
  });

  it("parses cusecs and percent without conversion", () => {
    expect(parseQuantities("12,000 cusecs released")[0]).toMatchObject({ dimension: "volume-rate", value: 12000 });
    expect(parseQuantities("40 per cent of the district")[0]).toMatchObject({ dimension: "percent", value: 40 });
  });
});
