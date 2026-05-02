/**
 * Registers new PDFs from the **primary S3 bucket** (`AWS_S3_BUCKET`) into `racecards`.
 * Source of truth for blobs is S3; Postgres rows are the catalog + `file_url` = S3 key.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, ListObjectsV2Command } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAwsS3Env, missingAwsS3EnvKeys } from "../_shared/awsS3Env.ts";
import { parseRacecardFilename, stripRacecardUuidPrefix } from "../_shared/parseRacecardFilename.ts";
import { getRacetrackLabel } from "../_shared/racetracks.ts";

const MAX_ERROR_DETAIL_CHARS = 2000;

function truncateDetail(message: string): string {
  if (message.length <= MAX_ERROR_DETAIL_CHARS) return message;
  return `${message.slice(0, MAX_ERROR_DETAIL_CHARS)}…`;
}

function errorDetailFromUnknown(err: unknown): string {
  if (err instanceof Error) return truncateDetail(err.message);
  return truncateDetail(String(err));
}

/** CORS for error responses if getCorsHeaders fails (should be rare). */
function corsHeadersForError(req: Request): Record<string, string> {
  try {
    return getCorsHeaders(req);
  } catch {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
  }
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

function formatPostgrestInsertDetail(err: { message: string; details?: string | null; hint?: string | null; code?: string | null }): string {
  const parts = [err.message];
  if (err.details) parts.push(err.details);
  if (err.hint) parts.push(`hint: ${err.hint}`);
  if (err.code) parts.push(`code: ${err.code}`);
  return truncateDetail(parts.filter(Boolean).join(" — "));
}

/**
 * Parse a track code and race date from an S3 key (basename rules in `../_shared/parseRacecardFilename.ts`).
 */
function parseS3Key(s3Key: string): { trackCode: string; raceDate: string; fileName: string } {
  const leaf = s3Key.split("/").pop() ?? s3Key;
  const baseName = stripRacecardUuidPrefix(leaf);
  const { trackCode, raceDate } = parseRacecardFilename(baseName);
  return { trackCode, raceDate, fileName: baseName };
}

/** Rejects malformed calendar dates that Postgres DATE would error on (e.g. 2026-02-31). */
function isValidPostgresDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const ms = Date.parse(`${iso}T12:00:00.000Z`);
  if (Number.isNaN(ms)) return false;
  const roundTrip = new Date(ms).toISOString().slice(0, 10);
  return roundTrip === iso;
}

async function handleRequest(req: Request): Promise<Response> {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

    const missingEdge = missingSupabaseEdgeKeys(!isCron);
    if (missingEdge.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Supabase Edge environment is incomplete",
          detail: `Set Edge Function secrets: ${missingEdge.join(", ")}`,
        }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.trim();

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    let actingUserId: string | null = null;

    if (!isCron) {
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!.trim();
      const supabaseUser = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
      if (userError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }

      actingUserId = user.id;
    }

    const aws = getAwsS3Env();
    if (!aws) {
      return new Response(
        JSON.stringify({
          error: "AWS S3 is not configured",
          detail: `Set Edge Function secrets: ${missingAwsS3EnvKeys().join(", ")}`,
        }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const s3 = new S3Client({
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    });

    // Fetch all keys already tracked in the DB
    const { data: existing } = await supabaseAdmin
      .from("racecards")
      .select("file_url");
    const knownKeys = new Set((existing ?? []).map((r: { file_url: string }) => r.file_url));

    // List all objects under racecards/ in S3
    const s3Objects: string[] = [];
    let continuationToken: string | undefined;

    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: aws.bucket,
        Prefix: "racecards/",
        ContinuationToken: continuationToken,
      });
      let listRes;
      try {
        listRes = await s3.send(listCmd);
      } catch (s3Err) {
        console.error("S3 list error:", s3Err);
        return new Response(
          JSON.stringify({
            error: "S3 list failed",
            detail: errorDetailFromUnknown(s3Err),
          }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      for (const obj of listRes.Contents ?? []) {
        if (obj.Key && obj.Key.endsWith(".pdf")) {
          s3Objects.push(obj.Key);
        }
      }

      continuationToken = listRes.IsTruncated ? listRes.NextContinuationToken : undefined;
    } while (continuationToken);

    // Find keys in S3 not yet in the DB
    const newKeys = s3Objects.filter((k) => !knownKeys.has(k));

    if (newKeys.length === 0) {
      return new Response(
        JSON.stringify({ added: 0, message: "No new racecards found in S3." }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Insert a DB row for each new S3 key (skip keys whose filename parses to an invalid DATE)
    const skippedInvalidDate: { key: string; race_date: string }[] = [];
    const rows = [] as Array<{
      file_name: string;
      file_url: string;
      track_code: string;
      track_name: string;
      race_date: string;
      uploaded_by: string | null;
    }>;

    // Cron uses actingUserId === null; do not reference user here.
    for (const s3Key of newKeys) {
      const { trackCode, raceDate, fileName } = parseS3Key(s3Key);
      if (!isValidPostgresDate(raceDate)) {
        skippedInvalidDate.push({ key: s3Key, race_date: raceDate });
        console.warn(`sync-s3-racecards: skip invalid race_date for ${s3Key}: ${raceDate}`);
        continue;
      }
      rows.push({
        file_name: fileName,
        file_url: s3Key,
        track_code: trackCode,
        track_name: getRacetrackLabel(trackCode),
        race_date: raceDate,
        uploaded_by: actingUserId,
      });
    }

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          added: 0,
          message:
            skippedInvalidDate.length > 0
              ? `No rows inserted — ${skippedInvalidDate.length} PDF(s) have filenames that do not yield a valid race date. Rename files to TRACKCODE_YYYY-MM-DD.pdf (or supported legacy shapes).`
              : "No new racecards found in S3.",
          skipped_invalid_date: skippedInvalidDate.slice(0, 50),
        }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const { error: insertError, count } = await supabaseAdmin
      .from("racecards")
      .insert(rows, { count: "exact" });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({
          error: "Failed to register new racecards",
          detail: formatPostgrestInsertDetail(insertError),
        }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        added: count ?? rows.length,
        ...(skippedInvalidDate.length > 0 ? { skipped_invalid_date: skippedInvalidDate.slice(0, 50) } : {}),
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("sync-s3-racecards error:", err);
    return new Response(
      JSON.stringify({ error: "S3 sync failed", detail: errorDetailFromUnknown(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
}

Deno.serve(async (req) => {
  try {
    return await handleRequest(req);
  } catch (err) {
    console.error("sync-s3-racecards uncaught (outer):", err);
    const cors = corsHeadersForError(req);
    return new Response(
      JSON.stringify({
        error: "S3 sync failed",
        detail: errorDetailFromUnknown(err),
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
