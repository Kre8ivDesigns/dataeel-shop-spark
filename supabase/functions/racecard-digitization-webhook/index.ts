import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type PredictionInput = {
  race_number?: unknown;
  algorithm?: unknown;
  rank?: unknown;
  horse_name?: unknown;
  horse_number?: unknown;
  odds?: unknown;
  score?: unknown;
  ocr_confidence?: unknown;
  raw_text?: unknown;
};

type RequestBody = {
  action?: unknown;
  s3Key?: unknown;
  jobId?: unknown;
  error?: unknown;
  predictions?: unknown;
};

type RacecardRow = {
  id: string;
  file_url: string;
};

const VALID_ACTIONS = new Set(["processing", "complete", "failed"]);

function jsonResponse(status: number, body: Record<string, unknown>, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanPrediction(row: PredictionInput) {
  const raceNumber = asNumber(row.race_number);
  const rank = asNumber(row.rank);
  const algorithm = asTrimmedString(row.algorithm)?.toLowerCase();
  const horseName = asTrimmedString(row.horse_name);

  if (!raceNumber || raceNumber < 1 || raceNumber > 30) return null;
  if (!rank || rank < 1) return null;
  if (algorithm !== "concert" && algorithm !== "aptitude") return null;
  if (!horseName) return null;

  return {
    race_number: Math.trunc(raceNumber),
    algorithm,
    rank: Math.trunc(rank),
    horse_name: horseName,
    horse_number: asTrimmedString(row.horse_number),
    odds: asTrimmedString(row.odds),
    score: asNumber(row.score),
    ocr_confidence: asNumber(row.ocr_confidence),
    raw_text: asTrimmedString(row.raw_text),
  };
}

async function findRacecard(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: { s3Key: string | null; jobId: string | null },
): Promise<RacecardRow | null> {
  if (params.jobId) {
    const { data, error } = await supabaseAdmin
      .from("racecards")
      .select("id, file_url")
      .eq("textract_job_id", params.jobId)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as RacecardRow;
  }

  if (params.s3Key) {
    const { data, error } = await supabaseAdmin
      .from("racecards")
      .select("id, file_url")
      .eq("file_url", params.s3Key)
      .maybeSingle();
    if (error) throw error;
    if (data) return data as RacecardRow;
  }

  return null;
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return jsonResponse(405, { error: "Method not allowed" }, cors);

  const expectedSecret = Deno.env.get("RACECARD_DIGITIZER_WEBHOOK_SECRET")?.trim();
  if (!expectedSecret) {
    return jsonResponse(503, { error: "RaceCard digitizer webhook is not configured" }, cors);
  }

  const providedSecret = req.headers.get("x-dataeel-digitizer-secret")?.trim();
  if (!providedSecret || providedSecret !== expectedSecret) {
    return jsonResponse(401, { error: "Unauthorized" }, cors);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(503, { error: "Supabase Edge environment is incomplete" }, cors);
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON" }, cors);
  }

  const action = asTrimmedString(body.action);
  if (!action || !VALID_ACTIONS.has(action)) {
    return jsonResponse(400, { error: "Invalid action" }, cors);
  }

  const s3Key = asTrimmedString(body.s3Key);
  const jobId = asTrimmedString(body.jobId);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
  const now = new Date().toISOString();

  try {
    if (action === "processing") {
      if (!s3Key || !jobId) return jsonResponse(400, { error: "s3Key and jobId are required" }, cors);

      const { data, error } = await supabaseAdmin
        .from("racecards")
        .update({
          digitization_status: "processing",
          textract_job_id: jobId,
          digitization_error: null,
          digitization_updated_at: now,
        })
        .eq("file_url", s3Key)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) return jsonResponse(404, { error: "racecard_not_found", retryable: true }, cors);
      return jsonResponse(200, { ok: true, racecard_id: data.id }, cors);
    }

    const racecard = await findRacecard(supabaseAdmin, { s3Key, jobId });
    if (!racecard) return jsonResponse(404, { error: "racecard_not_found", retryable: true }, cors);

    if (action === "failed") {
      await supabaseAdmin
        .from("racecard_predictions")
        .delete()
        .eq("racecard_id", racecard.id);

      const { error } = await supabaseAdmin
        .from("racecards")
        .update({
          digitization_status: "failed",
          digitization_error: asTrimmedString(body.error) ?? "Digitization failed",
          digitization_updated_at: now,
        })
        .eq("id", racecard.id);
      if (error) throw error;
      return jsonResponse(200, { ok: true, racecard_id: racecard.id }, cors);
    }

    const inputRows = Array.isArray(body.predictions) ? (body.predictions as PredictionInput[]) : [];
    const predictions = inputRows
      .map(cleanPrediction)
      .filter((row): row is NonNullable<ReturnType<typeof cleanPrediction>> => row !== null)
      .map((row) => ({ ...row, racecard_id: racecard.id }));

    const { error: deleteError } = await supabaseAdmin
      .from("racecard_predictions")
      .delete()
      .eq("racecard_id", racecard.id);
    if (deleteError) throw deleteError;

    if (predictions.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from("racecard_predictions")
        .insert(predictions);
      if (insertError) throw insertError;
    }

    const maxRaceNumber = predictions.reduce((max, row) => Math.max(max, row.race_number), 0);
    const { error: updateError } = await supabaseAdmin
      .from("racecards")
      .update({
        digitization_status: predictions.length > 0 ? "digitized" : "needs_review",
        digitization_error: predictions.length > 0 ? null : "OCR completed but no prediction rows were parsed.",
        digitization_updated_at: now,
        digitized_at: now,
        num_races: maxRaceNumber > 0 ? maxRaceNumber : null,
      })
      .eq("id", racecard.id);
    if (updateError) throw updateError;

    return jsonResponse(200, {
      ok: true,
      racecard_id: racecard.id,
      predictions_inserted: predictions.length,
      races_detected: maxRaceNumber,
    }, cors);
  } catch (err) {
    console.error("racecard-digitization-webhook error:", err);
    return jsonResponse(500, { error: "Digitization webhook failed" }, cors);
  }
});
