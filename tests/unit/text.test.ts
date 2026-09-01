import { describe, expect, it } from "vitest";
import {
  clamp,
  contentTokens,
  jaccard,
  splitSentences,
  stripHtml,
  textSimilarity,
  toParagraphs,
  truncate,
} from "@/lib/text";

describe("contentTokens", () => {
  it("lowercases, drops stopwords and folds simple suffixes", () => {
    const tokens = contentTokens("The Parliament INTRODUCED new regulations on Monday");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("on");
    expect(tokens).toContain("parliament");
    expect(tokens).toContain("introduc");
    expect(tokens).toContain("regulation");
  });
});

describe("jaccard", () => {
  it("is 1 for identical sets and 0 for disjoint", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
    expect(jaccard(["a"], ["b"])).toBe(0);
  });
  it("is symmetric", () => {
    const a = ["x", "y", "z"];
    const b = ["y", "z", "w"];
    expect(jaccard(a, b)).toBe(jaccard(b, a));
  });
});

describe("splitSentences", () => {
  it("splits on terminal punctuation but not abbreviations", () => {
    const sentences = splitSentences('Dr. Frost said the result held. The lab will share samples.');
    expect(sentences).toHaveLength(2);
    expect(sentences[0]).toContain("Dr. Frost");
  });
  it("keeps a closing quote with its sentence", () => {
    const sentences = splitSentences('He said "it is done." Then he left.');
    expect(sentences[0].endsWith('"')).toBe(true);
  });
});

describe("stripHtml", () => {
  it("removes tags and decodes entities", () => {
    expect(stripHtml("<p>Tom &amp; Jerry</p><script>bad()</script>")).toBe("Tom & Jerry");
  });
});

describe("toParagraphs", () => {
  it("splits on blank lines", () => {
    expect(toParagraphs("one\n\ntwo\n\nthree")).toEqual(["one", "two", "three"]);
  });
});

describe("truncate", () => {
  it("adds an ellipsis and stays within budget", () => {
    const out = truncate("a".repeat(50), 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("textSimilarity", () => {
  it("is high for near-duplicate text and low for unrelated text", () => {
    const a = "The National Assembly introduced the AI Systems Oversight Bill on Monday.";
    const b = "The National Assembly introduced the AI Systems Oversight Bill on Monday, opening debate.";
    const c = "Coastal flood barriers will be built along forty kilometres of shoreline.";
    expect(textSimilarity(a, b)).toBeGreaterThan(0.6);
    expect(textSimilarity(a, c)).toBeLessThan(0.2);
  });
});

describe("clamp", () => {
  it("bounds values", () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(0.5)).toBe(0.5);
  });
});
