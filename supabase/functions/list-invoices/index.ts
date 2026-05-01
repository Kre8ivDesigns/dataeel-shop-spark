import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { resolveStripeConfig } from "../_shared/stripe_config.ts";

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

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length === 0) {
        return new Response(JSON.stringify({ invoices: [] }), { status: 200, headers });
      }
      customerId = customers.data[0].id;
      await supabaseAdmin
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const invoices = await stripe.invoices.list({ customer: customerId, limit: 50 });

    const formattedInvoices = invoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number,
      amount: inv.amount_due / 100,
      currency: inv.currency,
      status: inv.status,
      created: inv.created,
      description: inv.description || inv.lines?.data?.[0]?.description || "Credit Purchase",
      pdf_url: inv.invoice_pdf,
      hosted_url: inv.hosted_invoice_url,
    }));

    return new Response(JSON.stringify({ invoices: formattedInvoices }), { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
