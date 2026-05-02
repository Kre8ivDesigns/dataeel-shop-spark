#!/usr/bin/env node
/**
 * Manual/backfill trigger for normalized race results ingestion.
 *
 * Required env:
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   CRON_SECRET=<same secret configured for Edge cron invocations>
 *
 * Optional env:
 *   RACE_RESULTS_SOURCE_URL=https://www.offtrackbetting.com/rss-results-2.0.xml
 *   DRY_RUN=1
 */

const supabaseUrl = process.env.SUPABASE_URL;
const cronSecret = process.env.CRON_SECRET;
const sourceUrl = process.env.RACE_RESULTS_SOURCE_URL;
const dryRun = process.env.DRY_RUN === "1";

if (!supabaseUrl || !cronSecret) {
  console.error("Missing required env: SUPABASE_URL and CRON_SECRET");
  process.exit(1);
}

const endpoint = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/ingest-race-results`;
const payload = {
  backfill: true,
  dryRun,
  ...(sourceUrl ? { sourceUrl } : {}),
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await response.text();
let body = null;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text };
}

if (!response.ok) {
  console.error("Backfill failed", response.status, body);
  process.exit(1);
}

console.log("Backfill completed");
console.log(JSON.stringify(body, null, 2));
