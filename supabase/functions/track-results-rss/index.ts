import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { buildTrackResultsRssXml, type TrackResultRecord } from "../_shared/track_results_rss.ts";
import { canonicalizeResultsTrackCode } from "../_shared/track_results.ts";

function jsonResponse(status: number, body: Record<string, unknown>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function parseLimit(value: string | null): number {
  if (!value) return 30;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(parsed, 100));
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "GET") return jsonResponse(405, { error: "Method not allowed" }, cors);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return jsonResponse(503, { error: "Supabase Edge environment is incomplete" }, cors);
  }

  const url = new URL(req.url);
  const requestedTrack = url.searchParams.get("track");
  const trackCode = canonicalizeResultsTrackCode(requestedTrack);
  if (!trackCode) {
    return jsonResponse(400, { error: "Invalid track code" }, cors);
  }

  const limit = parseLimit(url.searchParams.get("limit"));
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data, error } = await supabaseAdmin
    .from("race_results")
    .select(
      "source_id, track_code, track_name_raw, race_date, race_number, result_title, result_summary, result_description, source_url, source_pub_date",
    )
    .eq("track_code", trackCode)
    .order("race_date", { ascending: false })
    .order("race_number", { ascending: false })
    .order("source_pub_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    return jsonResponse(500, { error: "Failed to query race results", detail: error.message }, cors);
  }

  const xml = buildTrackResultsRssXml(trackCode, (data ?? []) as TrackResultRecord[]);
  return new Response(xml, {
    status: 200,
    headers: {
      ...cors,
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
});
