import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!webhookSecret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook not configured" }), { status: 500, headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "No signature" }), { status: 400, headers: corsHeaders });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
  }

  console.log("[stripe-webhook] Event received:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.user_id;
    const credits = parseInt(session.metadata?.credits || "0", 10);
    const packageName = session.metadata?.package_name || "Unknown";
    const amount = (session.amount_total || 0) / 100;

    if (!userId || credits <= 0) {
      console.error("[stripe-webhook] Missing metadata:", { userId, credits });
      return new Response(JSON.stringify({ error: "Invalid metadata" }), { status: 400, headers: corsHeaders });
    }

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get current balance
    const { data: balance, error: balError } = await supabaseAdmin
      .from("credit_balances")
      .select("credits")
      .eq("user_id", userId)
      .single();

    if (balError) {
      console.error("[stripe-webhook] Error fetching balance:", balError);
      return new Response(JSON.stringify({ error: "Balance lookup failed" }), { status: 500, headers: corsHeaders });
    }

    // Update credits
    const { error: updateError } = await supabaseAdmin
      .from("credit_balances")
      .update({ credits: (balance?.credits || 0) + credits })
      .eq("user_id", userId);

    if (updateError) {
      console.error("[stripe-webhook] Error updating credits:", updateError);
      return new Response(JSON.stringify({ error: "Credit update failed" }), { status: 500, headers: corsHeaders });
    }

    // Record transaction
    const { error: txError } = await supabaseAdmin
      .from("transactions")
      .insert({
        user_id: userId,
        amount,
        credits,
        package_name: packageName,
        status: "completed",
      });

    if (txError) {
      console.error("[stripe-webhook] Error recording transaction:", txError);
    }

    console.log("[stripe-webhook] Credits added:", { userId, credits, packageName });
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
