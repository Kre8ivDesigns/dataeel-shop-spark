import { getRacetrackLabel } from "./racetracks.ts";

export type ParsedFeedItem = {
  title: string;
  link: string;
  pubDate?: string;
  description?: string;
};

export type TrackResultRecord = {
  source_id: string;
  track_code: string;
  track_name_raw: string;
  race_date: string;
  race_number: number;
  result_title: string;
  result_summary: string | null;
  result_description: string | null;
  source_url: string;
  source_pub_date: string | null;
};

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&#8217;/gi, "’");
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
  const raw = firstTagInnerRaw(block, tag);
  if (!raw) return null;
  return decodeBasicEntities(stripTags(raw));
}

export function parseRssItems(xml: string, maxItems: number): ParsedFeedItem[] {
  const items: ParsedFeedItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];
    const title = firstTagContent(block, "title");
    const link = firstTagContent(block, "link");
    const pubDate = firstTagContent(block, "pubDate") ?? undefined;
    const descRaw = firstTagInnerRaw(block, "description");
    if (!title || !link) continue;
    items.push({
      title,
      link,
      pubDate,
      description: descRaw ? decodeBasicEntities(stripTags(descRaw)) : undefined,
    });
  }
  return items;
}

function toIsoDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function inferPubDate(record: TrackResultRecord): string {
  if (record.source_pub_date) return new Date(record.source_pub_date).toUTCString();
  return new Date(`${record.race_date}T12:00:00Z`).toUTCString();
}

export function buildTrackResultsRssXml(trackCode: string, records: TrackResultRecord[], siteUrl = "https://www.thedataeel.com"): string {
  const canonicalTrackLabel = getRacetrackLabel(trackCode);
  const nowRfc = new Date().toUTCString();
  const channelTitle = `${canonicalTrackLabel} Horse Racing Results`;
  const channelLink = `${siteUrl.replace(/\/$/, "")}/dashboard`;
  const channelDescription = `Latest ${canonicalTrackLabel} race results republished by Dataeel.`;

  const itemsXml = records
    .map((row) => {
      const title = row.result_title?.trim()
        ? row.result_title.trim()
        : `${canonicalTrackLabel} Race ${row.race_number} Results (${toIsoDate(row.race_date)})`;
      const summaryParts = [
        row.result_summary?.trim(),
        row.result_description?.trim(),
      ].filter(Boolean);
      const description = summaryParts.length > 0
        ? summaryParts.join(" ")
        : `${canonicalTrackLabel} race ${row.race_number} results on ${toIsoDate(row.race_date)}.`;
      return `<item>
  <guid isPermaLink="false">${xmlEscape(row.source_id)}</guid>
  <title>${xmlEscape(title)}</title>
  <link>${xmlEscape(row.source_url)}</link>
  <description>${xmlEscape(description)}</description>
  <pubDate>${xmlEscape(inferPubDate(row))}</pubDate>
</item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${xmlEscape(channelTitle)}</title>
  <link>${xmlEscape(channelLink)}</link>
  <description>${xmlEscape(channelDescription)}</description>
  <language>en-us</language>
  <lastBuildDate>${xmlEscape(nowRfc)}</lastBuildDate>
${itemsXml}
</channel>
</rss>`;
}
