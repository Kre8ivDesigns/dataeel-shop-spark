import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, getValidatedOrigin } from "../_shared/cors.ts";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

function validatedReturnUrl(req: Request, path: string): string {
  return `${getValidatedOrigin(req)}${path}`;
}

function isDeletedCustomer(customer: Stripe.Customer | Stripe.DeletedCustomer): customer is Stripe.DeletedCustomer {
  return "deleted" in customer && customer.deleted === true;
}

function isStripeMissingResource(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const stripeError = error as { code?: unknown; message?: unknown };
  return (
    stripeError.code === "resource_missing" ||
    (typeof stripeError.message === "string" && stripeError.message.includes("No such customer"))
  );
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

    const stripeConfig = await resolveStripeConfig(supabaseAdmin);
    if (!stripeConfig.secretKey) {
      return new Response(
        JSON.stringify({
          error:
            "Stripe is not configured. Add keys under Admin → Settings (with APP_SETTINGS_ENCRYPTION_KEY), or set STRIPE_SECRET_KEY.",
        }),
        { status: 503, headers },
      );
    }
    const stripe = new Stripe(stripeConfig.secretKey, { apiVersion: "2025-08-27.basil" });

    // HIGH-03: look up customer ID from profiles first
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId);
        if (isDeletedCustomer(customer)) customerId = undefined;
      } catch (err) {
        if (!isStripeMissingResource(err)) throw err;
        console.warn("[customer-portal] Stored Stripe customer was not found in the active Stripe mode.");
        customerId = undefined;
      }
    }

    if (!customerId) {
      // Migrated users may have app profiles/credits but no stored Stripe customer id.
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      customerId = customers.data[0]?.id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
      }

      const { error: profileUpdateError } = await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);

      if (profileUpdateError) {
        console.warn("[customer-portal] Could not persist stripe_customer_id:", profileUpdateError.message);
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: validatedReturnUrl(req, "/invoices"),
    });

    return new Response(JSON.stringify({ url: portalSession.url }), { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
