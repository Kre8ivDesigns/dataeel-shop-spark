import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Generate signed URL (5 minutes)
    const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
      .from("racecards")
      .createSignedUrl(racecard.file_url, 300);

    if (signError || !signedUrlData) {
      console.error("Signed URL error:", signError);
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
        signedUrl: signedUrlData.signedUrl,
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
