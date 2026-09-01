import { describe, expect, it } from "vitest";
import { parseFeed, rssAdapter } from "@/lib/ingestion/rss";

const RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Demo Feed</title>
  <item>
    <title><![CDATA[First headline]]></title>
    <link>https://demo.example/a/first</link>
    <description>Summary of the first item.</description>
    <pubDate>Mon, 01 Mar 2026 09:00:00 GMT</pubDate>
    <guid>https://demo.example/a/first</guid>
  </item>
  <item>
    <title>Second headline</title>
    <link>https://demo.example/a/second</link>
    <description><![CDATA[<p>HTML <b>summary</b></p>]]></description>
  </item>
</channel></rss>`;

const ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Atom Demo</title>
  <entry>
    <title>Atom entry one</title>
    <link rel="alternate" href="https://atom.example/1"/>
    <summary>Atom summary.</summary>
    <published>2026-03-01T10:00:00Z</published>
  </entry>
</feed>`;

describe("parseFeed", () => {
  it("parses RSS items with CDATA and dates", () => {
    const items = parseFeed(RSS);
    expect(items).toHaveLength(2);
    expect(items[0].title).toBe("First headline");
    expect(items[0].url).toBe("https://demo.example/a/first");
    expect(items[1].summary).toContain("HTML");
    expect(items[1].summary).not.toContain("<b>");
  });

  it("parses Atom entries via link[rel=alternate]", () => {
    const items = parseFeed(ATOM);
    expect(items).toHaveLength(1);
    expect(items[0].url).toBe("https://atom.example/1");
  });
});

describe("rssAdapter", () => {
  it("uses injected xml without any network access", async () => {
    const result = await rssAdapter.fetch({ feedUrl: "https://demo.example/feed.xml", xml: RSS });
    expect(result.adapter).toBe("rss");
    expect(result.items).toHaveLength(2);
  });
});
