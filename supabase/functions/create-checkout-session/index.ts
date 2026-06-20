import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getValidatedOrigin } from "../_shared/cors.ts";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

function stripeProductId(price: Stripe.Price): string {
  return typeof price.product === "string" ? price.product : price.product.id;
}

function priceMatchesCheckoutMode(price: Stripe.Price, isUnlimited: boolean): boolean {
  return isUnlimited ? price.recurring?.interval === "month" : price.recurring == null;
}

async function resolveCheckoutPriceId(
  supabaseAdmin: ReturnType<typeof createClient>,
  stripe: Stripe,
  pkg: {
    id: string;
    stripe_price_id: string;
    unlimited_credits: boolean;
  },
): Promise<string> {
  const isUnlimited = Boolean(pkg.unlimited_credits);
  const existingPrice = await stripe.prices.retrieve(pkg.stripe_price_id);
  if (priceMatchesCheckoutMode(existingPrice, isUnlimited)) {
    return existingPrice.id;
  }
  if (existingPrice.unit_amount == null) {
    throw new Error("Stripe price must have a fixed unit amount");
  }

  const productId = stripeProductId(existingPrice);
  const replacement = await stripe.prices.create({
    product: productId,
    unit_amount: existingPrice.unit_amount,
    currency: existingPrice.currency,
    recurring: isUnlimited ? { interval: "month" } : undefined,
  });

  await stripe.prices.update(existingPrice.id, { active: false });
  const { error: updateErr } = await supabaseAdmin
    .from("credit_packages")
    .update({ stripe_price_id: replacement.id, updated_at: new Date().toISOString() })
    .eq("id", pkg.id);
  if (updateErr) {
    console.warn("[create-checkout-session] Could not persist replacement Stripe price:", updateErr.message);
  }

  return replacement.id;
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
      .select("id, name, credits, stripe_price_id, unlimited_credits")
      .eq("id", packageId)
      .single();
    if (pkgError || !pkg) {
      return new Response(JSON.stringify({ error: "Invalid package selected" }), { status: 400, headers });
    }
    if (!pkg.stripe_price_id) {
      return new Response(JSON.stringify({ error: "Package has no associated Stripe price" }), { status: 400, headers });
    }

    const stripeConfig = await resolveStripeConfig(supabaseAdmin);
    if (!stripeConfig.secretKey) {
      return new Response(JSON.stringify({ error: "Stripe is not configured" }), { status: 500, headers });
    }
    const stripe = new Stripe(stripeConfig.secretKey, {
      apiVersion: "2025-08-27.basil",
    });

    const isUnlimited = Boolean(pkg.unlimited_credits);
    const creditsMeta = isUnlimited ? 0 : pkg.credits;

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
    if (!customerId) {
      return new Response(JSON.stringify({ error: "Could not resolve Stripe customer" }), { status: 500, headers });
    }

    // MED-08: use validated origin for redirect URLs
    const origin = getValidatedOrigin(req);

    const checkoutPriceId = await resolveCheckoutPriceId(supabaseAdmin, stripe, {
      id: pkg.id,
      stripe_price_id: pkg.stripe_price_id,
      unlimited_credits: isUnlimited,
    });

    const commonSessionParams = {
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: checkoutPriceId, quantity: 1 }],
      success_url: isUnlimited
        ? `${origin}/dashboard?payment=success&unlimited=1&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/dashboard?payment=success&credits=${pkg.credits}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/buy-credits?payment=cancelled`,
      metadata: {
        user_id: user.id,
        package_id: pkg.id,
        credits: String(creditsMeta),
        package_name: pkg.name,
        unlimited_credits: isUnlimited ? "true" : "false",
      },
    } satisfies Pick<
      Stripe.Checkout.SessionCreateParams,
      "customer" | "client_reference_id" | "line_items" | "success_url" | "cancel_url" | "metadata"
    >;

    const session = await stripe.checkout.sessions.create(
      isUnlimited
        ? {
            ...commonSessionParams,
            mode: "subscription",
            subscription_data: {
              metadata: commonSessionParams.metadata,
            },
          }
        : {
            ...commonSessionParams,
            mode: "payment",
            // Generates a Stripe Invoice + hosted invoice / PDF for one-time payments.
            invoice_creation: {
              enabled: true,
              invoice_data: {
                metadata: commonSessionParams.metadata,
              },
            },
          },
    );

    return new Response(JSON.stringify({ url: session.url }), { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error("[create-checkout-session] Error:", msg);
    return new Response(JSON.stringify({ error: msg.slice(0, 280) }), { status: 500, headers });
  }
});
