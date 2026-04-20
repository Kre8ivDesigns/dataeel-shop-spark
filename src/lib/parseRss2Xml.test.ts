import { describe, expect, it } from "vitest";
import { parseRss2Items } from "./parseRss2Xml";

describe("parseRss2Items", () => {
  it("returns empty array for non-xml", () => {
    expect(parseRss2Items("", 5)).toEqual([]);
  });

  it("parses RSS 2.0 items with CDATA titles", () => {
    const xml = `<?xml version="1.0"?>
<rss version="2.0"><channel>
<item>
  <title><![CDATA[Hello & Welcome]]></title>
  <link>https://example.com/a</link>
  <pubDate>Mon, 01 Jan 2024 12:00:00 GMT</pubDate>
</item>
<item>
  <title>Second Story</title>
  <link>https://example.com/b</link>
</item>
</channel></rss>`;
    const items = parseRss2Items(xml, 10);
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      title: "Hello & Welcome",
      link: "https://example.com/a",
      pubDate: "Mon, 01 Jan 2024 12:00:00 GMT",
    });
    expect(items[1]?.title).toBe("Second Story");
  });

  it("respects maxItems", () => {
    const xml = `<rss><channel>
${[1, 2, 3].map((i) => `<item><title>T${i}</title><link>https://x/${i}</link></item>`).join("")}
</channel></rss>`;
    expect(parseRss2Items(xml, 2)).toHaveLength(2);
  });

  it("parses WordPress-style RSS items (tabs / numeric entities in title)", () => {
    const xml = `<rss version="2.0"><channel>
	<item>
		<title>Europe&#8217;s Best &#38; Brightest</title>
		<link>https://www.thoroughbreddailynews.com/story/</link>
		<pubDate>Sun, 12 Apr 2026 13:24:11 +0000</pubDate>
	</item>
</channel></rss>`;
    const items = parseRss2Items(xml, 5);
    expect(items).toHaveLength(1);
    expect(items[0]?.title).toContain("’");
    expect(items[0]?.title).toContain("&");
    expect(items[0]?.link).toBe("https://www.thoroughbreddailynews.com/story/");
  });

  it("parses description with encoded HTML like Equibase RSS", () => {
    const xml = `<rss><channel><item>
<title>T</title>
<link>https://example.com</link>
<description>Race 01: &lt;b&gt;# 3 Horse&lt;/b&gt; &lt;i&gt;Scratched&lt;/i&gt;&lt;br/&gt;Race 02: Fast</description>
</item></channel></rss>`;
    const items = parseRss2Items(xml, 5);
    expect(items[0]?.description).toContain("Horse");
    expect(items[0]?.description).toContain("Scratched");
    expect(items[0]?.description).not.toContain("<");
  });
});
