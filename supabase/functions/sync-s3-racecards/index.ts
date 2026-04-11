/**
 * Registers new PDFs from the **primary S3 bucket** (`AWS_S3_BUCKET`) into `racecards`.
 * Source of truth for blobs is S3; Postgres rows are the catalog + `file_url` = S3 key.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, ListObjectsV2Command } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getCorsHeaders } from "../_shared/cors.ts";

/**
 * Parse a track code and race date from an S3 key.
 * Expected key format: racecards/<uuid>-TRACKCODE_YYYY-MM-DD.pdf
 * Falls back gracefully when the pattern isn't followed.
 */
function parseS3Key(s3Key: string): { trackCode: string; raceDate: string; fileName: string } {
  const fileName = s3Key.split("/").pop() ?? s3Key;
  // Strip the UUID prefix added by generate-upload-url (uuid-filename.pdf)
  const uuidPrefixRe = /^[0-9a-f-]{36}-(.+)$/i;
  const baseName = uuidPrefixRe.exec(fileName)?.[1] ?? fileName;

  const nameWithoutExt = baseName.replace(/\.pdf$/i, "");
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

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Admin-only
    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const bucket = Deno.env.get("AWS_S3_BUCKET")!;
    const region = Deno.env.get("AWS_REGION")!;

    const s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
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
        Bucket: bucket,
        Prefix: "racecards/",
        ContinuationToken: continuationToken,
      });
      const listRes = await s3.send(listCmd);

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
        uploaded_by: user.id,
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
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
