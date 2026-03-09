import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { S3Client, GetObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3";
import { getSignedUrl } from "https://esm.sh/@aws-sdk/s3-request-presigner@3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // User-context client (respects RLS)
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service role client (for signed URLs and atomic RPC)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { racecardId } = await req.json();
    if (!racecardId) {
      return new Response(JSON.stringify({ error: "Missing racecardId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get racecard info
    const { data: racecard, error: rcError } = await supabaseUser
      .from("racecards")
      .select("*")
      .eq("id", racecardId)
      .single();

    if (rcError || !racecard) {
      return new Response(JSON.stringify({ error: "Racecard not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Atomic credit check, deduction, and download recording
    const { data: result, error: rpcError } = await supabaseAdmin.rpc(
      "deduct_credit_if_sufficient",
      {
        p_user_id: user.id,
        p_racecard_id: racecardId,
        p_required_credits: 1,
      }
    );

    if (rpcError || !result || result.length === 0) {
      console.error("RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Failed to process download" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { success, already_owned } = result[0];

    if (!success) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits" }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate S3 pre-signed GET URL (5 minutes)
    const s3 = new S3Client({
      region: Deno.env.get("AWS_REGION")!,
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID")!,
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY")!,
      },
    });

    const command = new GetObjectCommand({
      Bucket: Deno.env.get("AWS_S3_BUCKET")!,
      Key: racecard.file_url,
      ResponseContentDisposition: `attachment; filename="${racecard.file_name}"`,
    });

    let signedUrl: string;
    try {
      signedUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
    } catch (signErr) {
      console.error("S3 sign error:", signErr);
      return new Response(
        JSON.stringify({ error: "Failed to generate download link" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        signedUrl,
        fileName: racecard.file_name,
        alreadyOwned: already_owned,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Download error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
