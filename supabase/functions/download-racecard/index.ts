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

    // Service role client (bypasses RLS for credit deduction)
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

    // Check if already downloaded (free re-download)
    const { data: existingDownload } = await supabaseUser
      .from("racecard_downloads")
      .select("id")
      .eq("user_id", user.id)
      .eq("racecard_id", racecardId)
      .maybeSingle();

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

    // If not previously downloaded, check & deduct credits
    if (!existingDownload) {
      const { data: balance, error: balError } = await supabaseUser
        .from("credit_balances")
        .select("credits")
        .eq("user_id", user.id)
        .single();

      if (balError || !balance || balance.credits < 1) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Deduct 1 credit (admin client to bypass RLS)
      const { error: deductError } = await supabaseAdmin
        .from("credit_balances")
        .update({ credits: balance.credits - 1 })
        .eq("user_id", user.id);

      if (deductError) {
        console.error("Credit deduction failed:", deductError);
        return new Response(
          JSON.stringify({ error: "Failed to deduct credit" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Record download
      await supabaseAdmin.from("racecard_downloads").insert({
        user_id: user.id,
        racecard_id: racecardId,
      });
    }

    // Generate signed URL (60 seconds)
    const { data: signedUrlData, error: signError } = await supabaseAdmin.storage
      .from("racecards")
      .createSignedUrl(racecard.file_url, 60);

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
        alreadyOwned: !!existingDownload,
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
