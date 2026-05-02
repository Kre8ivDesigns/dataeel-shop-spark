/** Minimal RSS 2.0 item parser for small feeds (America's Best Racing, etc.). */

import { decodeHtmlEntities } from "@/lib/decodeHtmlEntities";

export type Rss2Item = {
  title: string;
  link: string;
  pubDate?: string;
  /** Plain text (HTML stripped); e.g. Equibase scratch lines */
  description?: string;
};

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
  const decoded = decodeHtmlEntities(raw.trim());
  const spaced = decoded.replace(/<br\s*\/?>/gi, " ");
  return stripTags(spaced).replace(/\s+/g, " ").trim();
}

/**
 * First &lt;title&gt; inside the first &lt;channel&gt; (RSS 2.0).
 */
export function parseRss2ChannelTitle(xml: string): string | null {
  const ch = xml.match(/<channel\b[^>]*>([\s\S]*?)<\/channel>/i);
  if (!ch) return null;
  const titleRaw = firstTagContent(ch[1], "title");
  if (!titleRaw) return null;
  const t = decodeHtmlEntities(titleRaw).trim();
  return t || null;
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
    const title = decodeHtmlEntities(titleRaw).trim();
    const link = linkRaw.trim();
    if (!title || !link) continue;
    const description = descRaw ? normalizeRssDescriptionFragment(descRaw) : undefined;
    items.push({
      title,
      link,
      pubDate: pubRaw ? decodeHtmlEntities(pubRaw).trim() : undefined,
      description: description || undefined,
    });
  }
  return items;
}
