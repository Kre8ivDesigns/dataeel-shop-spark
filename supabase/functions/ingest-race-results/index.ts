import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { parseRssItems, type ParsedFeedItem } from "../_shared/track_results_rss.ts";
import {
  TARGET_RESULTS_TRACK_CODES,
  resolveResultsTrackCode,
} from "../_shared/track_results.ts";
import { getRacetrackLabel } from "../_shared/racetracks.ts";

const DEFAULT_SOURCE_URL = "https://www.offtrackbetting.com/rss-results-2.0.xml";
const SOURCE_FEED = "otb-results-rss-2.0";
const DEFAULT_FETCH_LIMIT = 1000;

type IngestRequest = {
  sourceUrl?: string;
  dryRun?: boolean;
  backfill?: boolean;
  limit?: number;
};

type NormalizedRow = {
  source_feed: string;
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
  payload: Record<string, unknown>;
};

function parseBody(req: Request): Promise<IngestRequest> {
  if (req.method !== "POST") return Promise.resolve({});
  return req.json().catch(() => ({}));
}

function missingSupabaseEdgeKeys(requireAnon: boolean): string[] {
  const missing: string[] = [];
  const url = Deno.env.get("SUPABASE_URL")?.trim();
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!url) missing.push("SUPABASE_URL");
  if (!service) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (requireAnon) {
    const anon = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
    if (!anon) missing.push("SUPABASE_ANON_KEY");
  }
  return missing;
}

async function requireIngestionAccess(req: Request, supabaseUrl: string, supabaseServiceRoleKey: string): Promise<{ ok: true; mode: "cron" | "admin" } | { ok: false; status: number; error: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { ok: false, status: 401, error: "Unauthorized" };

  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { ok: true, mode: "cron" };
  }

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (!anonKey) {
    return { ok: false, status: 503, error: "SUPABASE_ANON_KEY is required for JWT admin checks" };
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await supabaseUser.auth.getUser();
  if (userError || !user) return { ok: false, status: 401, error: "Unauthorized" };

  const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
  if (!isAdmin) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true, mode: "admin" };
}

function parseRaceNumber(text: string): number | null {
  const match = text.match(/\b(?:race|r)\s*#?\s*(\d{1,2})\b/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 10);
  if (!Number.isFinite(value) || value < 1 || value > 30) return null;
  return value;
}

function toIsoDate(pubDate: string | undefined): string {
  if (!pubDate) return new Date().toISOString().slice(0, 10);
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function toIsoTimestamp(pubDate: string | undefined): string | null {
  if (!pubDate) return null;
  const d = new Date(pubDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function normalizeItem(item: ParsedFeedItem): Promise<NormalizedRow | null> {
  const mergedText = [item.title, item.description].filter(Boolean).join(" ");
  const trackCode = resolveResultsTrackCode({
    title: item.title,
    description: item.description,
  });
  if (!trackCode) return null;

  const raceNumber = parseRaceNumber(mergedText);
  if (!raceNumber) return null;

  const raceDate = toIsoDate(item.pubDate);
  const trackLabel = getRacetrackLabel(trackCode);
  const sourceId = await sha256Hex(
    `${SOURCE_FEED}|${trackCode}|${raceDate}|${raceNumber}|${item.link}|${item.title}`,
  );
  return {
    source_feed: SOURCE_FEED,
    source_id: sourceId,
    track_code: trackCode,
    track_name_raw: trackLabel,
    race_date: raceDate,
    race_number: raceNumber,
    result_title: item.title.trim(),
    result_summary: item.description?.trim() ?? null,
    result_description: item.description?.trim() ?? null,
    source_url: item.link.trim(),
    source_pub_date: toIsoTimestamp(item.pubDate),
    payload: {
      source_title: item.title,
      source_description: item.description ?? null,
    },
  };
}

function jsonResponse(status: number, body: Record<string, unknown>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, cors);

  const missingEdge = missingSupabaseEdgeKeys(true);
  if (missingEdge.length > 0) {
    return jsonResponse(503, { error: "Supabase Edge environment is incomplete", detail: `Set Edge Function secrets: ${missingEdge.join(", ")}` }, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!.trim();
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.trim();
  const access = await requireIngestionAccess(req, supabaseUrl, supabaseServiceRoleKey);
  if (!access.ok) {
    return jsonResponse(access.status, { error: access.error }, cors);
  }

  const body = await parseBody(req);
  const sourceUrl = (body.sourceUrl ?? DEFAULT_SOURCE_URL).trim();
  const dryRun = body.dryRun === true;
  const backfill = body.backfill === true;
  const fetchLimit = Math.max(1, Math.min(body.limit ?? DEFAULT_FETCH_LIMIT, 2500));
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    console.info("[ingest-race-results] starting", {
      sourceUrl,
      dryRun,
      backfill,
      fetchLimit,
      mode: access.mode,
      configuredTracks: TARGET_RESULTS_TRACK_CODES.length,
    });

    const upstream = await fetch(sourceUrl, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "DataeelShop/1.0 (+https://www.thedataeel.com; race results ingest)",
      },
    });
    if (!upstream.ok) {
      return jsonResponse(502, { error: "Upstream feed unavailable", status: upstream.status }, cors);
    }
    const xml = await upstream.text();
    const parsed = parseRssItems(xml, fetchLimit);

    let skippedNoTrack = 0;
    let skippedNoRaceNumber = 0;
    const normalized: NormalizedRow[] = [];
    for (const item of parsed) {
      const resolvedTrack = resolveResultsTrackCode({ title: item.title, description: item.description });
      if (!resolvedTrack) {
        skippedNoTrack += 1;
        continue;
      }
      const mergedText = [item.title, item.description].filter(Boolean).join(" ");
      const raceNumber = parseRaceNumber(mergedText);
      if (!raceNumber) {
        skippedNoRaceNumber += 1;
        continue;
      }
      const row = await normalizeItem(item);
      if (row) normalized.push(row);
    }

    const uniqueBySourceId = new Map<string, NormalizedRow>();
    for (const row of normalized) uniqueBySourceId.set(row.source_id, row);
    const rows = Array.from(uniqueBySourceId.values());

    if (rows.length === 0) {
      return jsonResponse(200, {
        source_url: sourceUrl,
        fetched: parsed.length,
        matched: 0,
        inserted: 0,
        updated: 0,
        skipped: parsed.length,
        skipped_no_track: skippedNoTrack,
        skipped_no_race_number: skippedNoRaceNumber,
        dry_run: dryRun,
        backfill,
      }, cors);
    }

    const sourceIds = rows.map((row) => row.source_id);
    const { data: existingRows, error: existingError } = await supabaseAdmin
      .from("race_results")
      .select("source_id")
      .in("source_id", sourceIds);
    if (existingError) {
      console.error("[ingest-race-results] failed to query existing source ids", existingError);
      return jsonResponse(500, { error: "Failed to query existing results", detail: existingError.message }, cors);
    }
    const existingSet = new Set((existingRows ?? []).map((r: { source_id: string }) => r.source_id));
    const inserted = rows.filter((r) => !existingSet.has(r.source_id)).length;
    const updated = rows.length - inserted;

    if (!dryRun) {
      const { error: upsertError } = await supabaseAdmin.from("race_results").upsert(rows, {
        onConflict: "source_id",
      });
      if (upsertError) {
        console.error("[ingest-race-results] upsert failed", upsertError);
        return jsonResponse(500, { error: "Failed to upsert race results", detail: upsertError.message }, cors);
      }
    }

    return jsonResponse(200, {
      source_url: sourceUrl,
      fetched: parsed.length,
      matched: rows.length,
      inserted,
      updated,
      skipped: parsed.length - rows.length,
      skipped_no_track: skippedNoTrack,
      skipped_no_race_number: skippedNoRaceNumber,
      dry_run: dryRun,
      backfill,
      sample_tracks: Array.from(new Set(rows.map((r) => r.track_code))).slice(0, 10),
    }, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected ingestion error";
    console.error("[ingest-race-results] unexpected error", error);
    return jsonResponse(500, { error: message }, cors);
  }
});
