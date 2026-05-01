/**
 * Registers new PDFs from the **primary S3 bucket** (`AWS_S3_BUCKET`) into `racecards`.
 * Source of truth for blobs is S3; Postgres rows are the catalog + `file_url` = S3 key.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, ListObjectsV2Command } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAwsS3Env, missingAwsS3EnvKeys } from "../_shared/awsS3Env.ts";

const MAX_ERROR_DETAIL_CHARS = 2000;

function truncateDetail(message: string): string {
  if (message.length <= MAX_ERROR_DETAIL_CHARS) return message;
  return `${message.slice(0, MAX_ERROR_DETAIL_CHARS)}…`;
}

function errorDetailFromUnknown(err: unknown): string {
  if (err instanceof Error) return truncateDetail(err.message);
  return truncateDetail(String(err));
}

/**
 * Parse a track code and race date from an S3 key.
 * Supported basename patterns (after optional `uuid-` prefix):
 * - `TRACKCODE_YYYY-MM-DD.pdf` (admin upload)
 * - `TRACKCODE_YYYY-MM-DD__2.pdf` (same track/day second card; from prepare-racecards-for-s3.mjs)
 */
function parseS3Key(s3Key: string): { trackCode: string; raceDate: string; fileName: string } {
  const fileName = s3Key.split("/").pop() ?? s3Key;
  // Strip the UUID prefix added by generate-upload-url (uuid-filename.pdf)
  const uuidPrefixRe = /^[0-9a-f-]{36}-(.+)$/i;
  const baseName = uuidPrefixRe.exec(fileName)?.[1] ?? fileName;

  const nameWithoutExt = baseName.replace(/\.pdf$/i, "");
  const strict = /^([A-Z0-9]+)_(20\d{2}-\d{2}-\d{2})(?:__\d+)?$/i.exec(nameWithoutExt);
  if (strict) {
    const trackCode = strict[1].toUpperCase();
    const raceDate = strict[2];
    return { trackCode, raceDate, fileName: baseName };
  }

  const parts = nameWithoutExt.split("_");
  const rawTrackCode = (parts[0] ?? "").replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const trackCode =
    rawTrackCode.length > 0 && rawTrackCode.length <= 10 ? rawTrackCode : "UNK";

  const rawDate = parts[1] ?? "";
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isValidDate = dateRegex.test(rawDate) && !isNaN(new Date(rawDate).getTime());
  const raceDate = isValidDate ? rawDate : new Date().toISOString().split("T")[0];

  return { trackCode, raceDate, fileName: baseName };
}

Deno.serve(async (req) => {
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Allow cron invocations via shared secret (no user session available)
    const cronSecret = Deno.env.get("CRON_SECRET");
    const isCron = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

    let actingUserId: string | null = null;

    if (!isCron) {
      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

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
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Insert a DB row for each new S3 key
    const rows = newKeys.map((s3Key) => {
      const { trackCode, raceDate, fileName } = parseS3Key(s3Key);
      return {
        file_name: fileName,
        file_url: s3Key,
        track_code: trackCode,
        track_name: trackCode,
        race_date: raceDate,
        ...(actingUserId ? { uploaded_by: actingUserId } : { uploaded_by: null }),
      };
    });

    const { error: insertError, count } = await supabaseAdmin
      .from("racecards")
      .insert(rows, { count: "exact" });

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to register new racecards", detail: insertError.message }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ added: count ?? rows.length }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-s3-racecards error:", err);
    return new Response(
      JSON.stringify({ error: "S3 sync failed", detail: errorDetailFromUnknown(err) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
