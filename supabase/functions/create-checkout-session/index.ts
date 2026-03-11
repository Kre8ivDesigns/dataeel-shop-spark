import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://dataeel-shop-spark-three.vercel.app",
  "https://dataeel-shop-spark.lovable.app",
  "http://localhost:5173",
  "http://localhost:3000",
];

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

function validatedOrigin(req: Request): string {
  const origin = req.headers.get("origin") ?? "";
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  const headers = { ...corsHeaders(req), "Content-Type": "application/json" };

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers });
    }

    const { packageId } = await req.json();
    if (!packageId) {
      return new Response(JSON.stringify({ error: "packageId is required" }), { status: 400, headers });
    }

    // Look up package from DB
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("credit_packages")
      .select("id, name, credits, stripe_price_id")
      .eq("id", packageId)
      .single();
    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Invalid package selected" }), { status: 400, headers });
    }
    if (!pkg.stripe_price_id) {
      return new Response(JSON.stringify({ error: "Package has no associated Stripe price" }), { status: 400, headers });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // HIGH-03: look up Stripe customer ID from profiles first
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (!customerId) {
      // Fall back to email search, then create
      const existing = await stripe.customers.list({ email: user.email, limit: 1 });
      if (existing.data.length > 0) {
        customerId = existing.data[0].id;
      } else {
        const newCustomer = await stripe.customers.create({ email: user.email });
        customerId = newCustomer.id;
      }
      // Persist for future requests
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // MED-08: use validated origin for redirect URLs
    const origin = validatedOrigin(req);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: pkg.stripe_price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/dashboard?payment=success&credits=${pkg.credits}`,
      cancel_url: `${origin}/buy-credits?payment=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(pkg.credits),
        package_name: pkg.name,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });
  } catch (error) {
    console.error("[create-checkout-session] Error:", error instanceof Error ? error.message : "unknown");
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers });
  }
});
