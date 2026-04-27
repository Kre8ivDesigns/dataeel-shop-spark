import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getValidatedOrigin } from "../_shared/cors.ts";
import { decryptSettingValue } from "../_shared/decrypt_setting.ts";

async function loadStripeKey(supabaseAdmin: ReturnType<typeof createClient>, encryptionKey: string): Promise<string | null> {
  const { data: rows } = await supabaseAdmin
    .from("app_settings")
    .select("key, encrypted_value")
    .in("key", ["stripe_mode", "stripe_secret_key", "stripe_test_secret_key"]);

  const settings: Record<string, string> = {};
  for (const row of rows ?? []) {
    try { settings[row.key] = await decryptSettingValue(row.encrypted_value, encryptionKey); } catch { /* skip */ }
  }

  const mode = settings.stripe_mode ?? "live";
  const key = mode === "test" ? settings.stripe_test_secret_key : settings.stripe_secret_key;
  return key?.trim() || Deno.env.get("STRIPE_SECRET_KEY") || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const headers = { ...getCorsHeaders(req), "Content-Type": "application/json" };

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

    const encryptionKey = Deno.env.get("APP_SETTINGS_ENCRYPTION_KEY") ?? "";
    const stripeKey = encryptionKey.length >= 64
      ? await loadStripeKey(supabaseAdmin, encryptionKey)
      : Deno.env.get("STRIPE_SECRET_KEY") ?? null;

    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "Stripe is not configured. An admin must add the Stripe key under Admin → Settings." }), { status: 503, headers });
    }

    const stripe = new Stripe(stripeKey, {
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
    const origin = getValidatedOrigin(req);

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
    const msg = error instanceof Error ? error.message : "unknown";
    console.error("[create-checkout-session] Error:", msg);
    return new Response(JSON.stringify({ error: msg.slice(0, 280) }), { status: 500, headers });
  }
});
