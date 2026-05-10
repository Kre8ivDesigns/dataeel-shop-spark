#!/usr/bin/env node
/**
 * Backfills historical race results from Equibase mobile result pages into SQL.
 *
 * Usage:
 *   node scripts/backfill-equibase-results.mjs --date 2026-05-02 --tracks BAQ,CD,GP > /tmp/equibase-results.sql
 */
import crypto from "node:crypto";

const SOURCE_FEED = "equibase-mobile-results";
const BASE_URL = "https://mobile.equibase.com/html";

const CODE_ALIASES = {
  DM: "DMR",
  EL: "ELP",
  GPW: "GP",
};

const TARGET_CODES = new Set([
  "AQU",
  "ASD",
  "BAQ",
  "BEL",
  "BTP",
  "CD",
  "CMR",
  "CT",
  "DMR",
  "ELP",
  "FE",
  "FG",
  "FL",
  "GG",
  "GP",
  "HAW",
  "KD",
  "KEE",
  "LRL",
  "MED",
  "MNR",
  "MTH",
  "MVR",
  "OP",
  "PEN",
  "PIM",
  "PRX",
  "SA",
  "SAR",
  "TAM",
  "WO",
]);

function argValue(name, fallback = null) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return fallback;
  return process.argv[idx + 1] ?? fallback;
}

function canonicalTrackCode(raw) {
  const normalized = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\^+$/, "")
    .replace(/[^A-Z0-9]/g, "");
  const prefixed = /^([A-Z]{2,4})(\d{4,})/.exec(normalized);
  const code = CODE_ALIASES[prefixed?.[1] ?? normalized] ?? (prefixed?.[1] ?? normalized);
  return TARGET_CODES.has(code) ? code : null;
}

function dateParts(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Expected --date YYYY-MM-DD, got ${isoDate}`);
  return { yyyy: match[1], mm: match[2], dd: match[3], compact: `${match[1]}${match[2]}${match[3]}` };
}

function decodeEntities(value) {
  return String(value ?? "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html) {
  return decodeEntities(String(html ?? "").replace(/<[^>]*>/g, " "));
}

function sqlString(value) {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function extractIndexTrackName(html) {
  const match = /green\.gif"><br>\s*([^<]+?)\s*<br>\s*<table/i.exec(html);
  return decodeEntities(match?.[1] ?? "");
}

function extractRaceLinks(html) {
  const links = [];
  const re = /<a\s+href="([^"]*results[A-Z0-9]+(\d{2})\.html)"[^>]*>\s*Race\s+(\d{1,2})\b[^<]*<\/a>/gi;
  for (const match of html.matchAll(re)) {
    const raceNumber = Number(match[3]);
    if (Number.isFinite(raceNumber) && raceNumber >= 1 && raceNumber <= 30) {
      links.push({ href: match[1].startsWith("http") ? match[1] : `https://mobile.equibase.com${match[1]}`, raceNumber });
    }
  }
  return links;
}

function cellsBetween(html, startPattern, endPattern) {
  const start = html.search(startPattern);
  if (start === -1) return [];
  const fromStart = html.slice(start);
  const end = fromStart.search(endPattern);
  const section = end === -1 ? fromStart : fromStart.slice(0, end);
  return [...section.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean);
}

function textAfterLabel(html, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`<b>${escaped}:\\s*<\\/b>([\\s\\S]*?)(?:<br>\\s*<br>|<table|\\[<a|$)`, "i").exec(html);
  return decodeEntities(stripTags(match?.[1] ?? ""));
}

function parseRacePage(html, { trackCode, trackName, raceDate, raceNumber, sourceUrl }) {
  const header = /<b>(\d{2})\/(\d{2})\/(\d{4})\s+Race\s+(\d{1,2})(?:\s*-\s*([^<]+))?<\/b>/i.exec(html);
  const titleRaceNumber = header ? Number(header[4]) : raceNumber;
  const raceTitle = decodeEntities(header?.[5] ?? "");
  const postTime = decodeEntities(/<b>Post Time:\s*([^<]+)<\/b>/i.exec(html)?.[1] ?? "");
  const finishers = cellsBetween(html, /green\.gif"><br>\s*<table/i, /<b>Exotics<\/b>/i);
  if (finishers.length === 0) return null;

  const exotics = cellsBetween(html, /<b>Exotics<\/b>/i, /green\.gif"><br>\s*<b>Also Ran:/i);
  const alsoRan = textAfterLabel(html, "Also Ran");
  const scratches = textAfterLabel(html, "Scratches");
  const topThree = finishers.slice(0, 3);
  const resultSummary = topThree
    .map((line, idx) => `${idx + 1}${idx === 0 ? "st" : idx === 1 ? "nd" : "rd"}: ${line}`)
    .join("; ");
  const descriptionParts = [
    resultSummary,
    alsoRan ? `Also ran: ${alsoRan}` : null,
    scratches ? `Scratches: ${scratches}` : null,
    exotics.length > 0 ? `Exotics: ${exotics.join("; ")}` : null,
  ].filter(Boolean);

  return {
    source_feed: SOURCE_FEED,
    source_id: sha256(`${SOURCE_FEED}|${trackCode}|${raceDate}|${titleRaceNumber}|${sourceUrl}`),
    track_code: trackCode,
    track_name_raw: trackName || trackCode,
    race_date: raceDate,
    race_number: titleRaceNumber,
    result_title: `Race ${titleRaceNumber}${raceTitle ? ` - ${raceTitle}` : ""}`,
    result_summary: resultSummary,
    result_description: descriptionParts.join("\n"),
    source_url: sourceUrl,
    source_pub_date: null,
    payload: { post_time: postTime || null, finishers, exotics, also_ran: alsoRan || null, scratches: scratches || null },
  };
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,application/xhtml+xml,*/*",
      "User-Agent": "DataeelShop/1.0 (+https://www.thedataeel.com; Equibase historical result backfill)",
    },
  });
  if (!response.ok) return null;
  return response.text();
}

function rowsToSql(rows) {
  const values = rows.map((row) => `(
    ${sqlString(row.source_feed)},
    ${sqlString(row.source_id)},
    ${sqlString(row.track_code)},
    ${sqlString(row.track_name_raw)},
    ${sqlString(row.race_date)}::date,
    ${row.race_number},
    ${sqlString(row.result_title)},
    ${sqlString(row.result_summary)},
    ${sqlString(row.result_description)},
    ${sqlString(row.source_url)},
    ${row.source_pub_date ? `${sqlString(row.source_pub_date)}::timestamptz` : "NULL"},
    ${sqlString(JSON.stringify(row.payload))}::jsonb
  )`);

  return `INSERT INTO public.race_results (
  source_feed,
  source_id,
  track_code,
  track_name_raw,
  race_date,
  race_number,
  result_title,
  result_summary,
  result_description,
  source_url,
  source_pub_date,
  payload
)
VALUES
${values.join(",\n")}
ON CONFLICT (source_id) DO UPDATE SET
  track_code = EXCLUDED.track_code,
  track_name_raw = EXCLUDED.track_name_raw,
  race_date = EXCLUDED.race_date,
  race_number = EXCLUDED.race_number,
  result_title = EXCLUDED.result_title,
  result_summary = EXCLUDED.result_summary,
  result_description = EXCLUDED.result_description,
  source_url = EXCLUDED.source_url,
  source_pub_date = EXCLUDED.source_pub_date,
  payload = EXCLUDED.payload,
  updated_at = now();
`;
}

async function main() {
  const raceDate = argValue("--date");
  const tracksArg = argValue("--tracks");
  const outFormat = argValue("--format", "sql");
  if (!raceDate || !tracksArg) {
    console.error("Usage: node scripts/backfill-equibase-results.mjs --date YYYY-MM-DD --tracks BAQ,CD --format sql|json");
    process.exit(1);
  }

  const { compact } = dateParts(raceDate);
  const tracks = [...new Set(tracksArg.split(",").map(canonicalTrackCode).filter(Boolean))];
  const rows = [];
  const skipped = [];

  for (const trackCode of tracks) {
    const indexUrl = `${BASE_URL}/results${trackCode}${compact}.html`;
    const indexHtml = await fetchText(indexUrl);
    if (!indexHtml) {
      skipped.push({ trackCode, reason: "missing_index", indexUrl });
      continue;
    }
    const trackName = extractIndexTrackName(indexHtml) || trackCode;
    const links = extractRaceLinks(indexHtml);
    if (links.length === 0) {
      skipped.push({ trackCode, reason: "no_race_links", indexUrl });
      continue;
    }
    for (const link of links) {
      const html = await fetchText(link.href);
      if (!html) {
        skipped.push({ trackCode, reason: "missing_race", sourceUrl: link.href });
        continue;
      }
      const row = parseRacePage(html, {
        trackCode,
        trackName,
        raceDate,
        raceNumber: link.raceNumber,
        sourceUrl: link.href,
      });
      if (row) rows.push(row);
      else skipped.push({ trackCode, reason: "unparsed_race", sourceUrl: link.href });
    }
  }

  if (outFormat === "json") {
    console.log(JSON.stringify({ rows, skipped }, null, 2));
    return;
  }
  console.log(`-- Equibase historical results backfill for ${raceDate}`);
  console.log(`-- rows=${rows.length} skipped=${skipped.length}`);
  if (skipped.length > 0) console.log(`-- skipped=${JSON.stringify(skipped).replace(/\n/g, " ")}`);
  if (rows.length > 0) console.log(rowsToSql(rows));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
