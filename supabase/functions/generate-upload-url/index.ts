/**
 * Presigned PUT for RaceCard PDFs. Primary object store is **AWS S3** (`AWS_S3_BUCKET`);
 * `racecards.file_url` must hold this S3 object key after upload.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getAwsS3Env, missingAwsS3EnvKeys } from "../_shared/awsS3Env.ts";

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const headers = { ...cors, "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });
    }

    const { fileName } = await req.json();
    if (!fileName) {
      return new Response(JSON.stringify({ error: "Missing fileName" }), { status: 400, headers });
    }

    const aws = getAwsS3Env();
    if (!aws) {
      return new Response(
        JSON.stringify({
          error: "AWS S3 is not configured",
          detail: `Set Edge Function secrets: ${missingAwsS3EnvKeys().join(", ")}`,
        }),
        { status: 503, headers },
      );
    }

    const s3 = new S3Client({
      region: aws.region,
      credentials: {
        accessKeyId: aws.accessKeyId,
        secretAccessKey: aws.secretAccessKey,
      },
    });

    const s3Key = `racecards/${crypto.randomUUID()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: aws.bucket,
      Key: s3Key,
      ContentType: "application/pdf",
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600 });

    return new Response(JSON.stringify({ uploadUrl, s3Key }), { status: 200, headers });
  } catch (err) {
    const msg = errMessage(err);
    console.error("generate-upload-url error:", msg);
    return new Response(
      JSON.stringify({ error: "Failed to create upload URL", detail: msg.slice(0, 2000) }),
      { status: 500, headers },
    );
  }
});
