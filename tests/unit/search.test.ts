import { describe, expect, it } from "vitest";
import { InMemorySearch, type SearchDoc } from "@/lib/search";

const docs: SearchDoc[] = [
  { type: "event", id: "e1", title: "National Assembly introduces AI oversight bill", body: "registration duty supervisory unit ministry digital affairs", url: "/events/e1" },
  { type: "event", id: "e2", title: "Reserve Bank holds benchmark rate", body: "monetary policy committee 3.75 percent data dependent", url: "/events/e2" },
  { type: "claim", id: "c1", title: "The bill creates a supervisory unit", body: "AI oversight bill ministry", url: "/events?claim=c1" },
  { type: "source", id: "s1", title: "Transregional Newswire", body: "wire service Republic of Ardenne", url: "/sources/s1" },
];

describe("InMemorySearch", () => {
  const search = new InMemorySearch();
  search.index(docs);

  it("ranks the most relevant document first", () => {
    const results = search.search("AI oversight bill");
    expect(results[0].id).toBe("e1");
  });

  it("applies a type prior so events outrank claims on an otherwise equal match", () => {
    const tied = new InMemorySearch();
    tied.index([
      { type: "event", id: "ev", title: "border dispute talks", body: "border dispute talks", url: "/events/ev" },
      { type: "claim", id: "cl", title: "border dispute talks", body: "border dispute talks", url: "/events?claim=cl" },
    ]);
    const results = tied.search("border dispute talks");
    expect(results[0].type).toBe("event");
  });

  it("filters by type", () => {
    const results = search.search("Ardenne wire", { types: ["source"] });
    expect(results.every((r) => r.type === "source")).toBe(true);
  });

  it("returns nothing for an empty query", () => {
    expect(search.search("")).toEqual([]);
  });

  it("returns a snippet drawn from the matching text", () => {
    const [top] = search.search("monetary policy");
    expect(top.snippet.toLowerCase()).toContain("monetary");
  });
});
