import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Map package IDs to Stripe price IDs and credit amounts
const PACKAGES: Record<string, { priceId: string; credits: number; name: string }> = {
  single: { priceId: "price_1T5TJoI2kIUOizBRFylaVi9V", credits: 1, name: "Single" },
  starter: { priceId: "price_1T5TM0I2kIUOizBRqvb18FTH", credits: 5, name: "Starter" },
  "best-value": { priceId: "price_1T5TMNI2kIUOizBRYHSZUcQM", credits: 15, name: "Best Value" },
  pro: { priceId: "price_1T5TaDI2kIUOizBR807We5Dz", credits: 40, name: "Pro" },
  season: { priceId: "price_1T5TaRI2kIUOizBRXKDPWShk", credits: 100, name: "Season Pass" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;

    // Parse and validate request
    const { packageId } = await req.json();
    const pkg = PACKAGES[packageId];
    if (!pkg) throw new Error("Invalid package selected");

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or reference existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://dataeel-shop-spark.lovable.app";

    // Create one-time payment checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pkg.priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/dashboard?payment=success&credits=${pkg.credits}`,
      cancel_url: `${origin}/buy-credits?payment=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: packageId,
        credits: String(pkg.credits),
        package_name: pkg.name,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[create-checkout-session] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
