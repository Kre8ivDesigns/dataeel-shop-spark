/** Minimal RSS 2.0 item parser for small feeds (America's Best Racing, etc.). */

export type Rss2Item = {
  title: string;
  link: string;
  pubDate?: string;
  /** Plain text (HTML stripped); e.g. Equibase scratch lines */
  description?: string;
};

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)));
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, "").trim();
}

function firstTagInnerRaw(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return null;
  let inner = m[1].trim();
  const cdata = inner.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/i);
  if (cdata) inner = cdata[1].trim();
  return inner || null;
}

function firstTagContent(block: string, tag: string): string | null {
  const inner = firstTagInnerRaw(block, tag);
  if (inner === null) return null;
  const innerStripped = stripTags(inner);
  return innerStripped || null;
}

/** Decode entities, turn &lt;br&gt; into space, strip tags, collapse whitespace. */
export function normalizeRssDescriptionFragment(raw: string): string {
  const decoded = decodeXmlEntities(raw.trim());
  const spaced = decoded.replace(/<br\s*\/?>/gi, " ");
  return stripTags(spaced).replace(/\s+/g, " ").trim();
}

/**
 * Extract up to `maxItems` entries from RSS 2.0 XML text.
 */
export function parseRss2Items(xml: string, maxItems: number): Rss2Item[] {
  const items: Rss2Item[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null && items.length < maxItems) {
    const block = m[1];
    const titleRaw = firstTagContent(block, "title");
    const linkRaw = firstTagContent(block, "link");
    const pubRaw = firstTagContent(block, "pubDate");
    const descRaw = firstTagInnerRaw(block, "description");
    if (!titleRaw || !linkRaw) continue;
    const title = decodeXmlEntities(titleRaw).trim();
    const link = linkRaw.trim();
    if (!title || !link) continue;
    const description = descRaw ? normalizeRssDescriptionFragment(descRaw) : undefined;
    items.push({
      title,
      link,
      pubDate: pubRaw ? decodeXmlEntities(pubRaw).trim() : undefined,
      description: description || undefined,
    });
  }
  return items;
}
