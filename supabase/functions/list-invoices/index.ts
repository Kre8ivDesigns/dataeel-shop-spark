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

    // One-time Checkout in "payment" mode does not create Stripe Invoices unless
    // invoice_creation is enabled on the session. The webhook always writes completed
    // purchases to `transactions` — that is the source of truth for this app.
    const { data: txs, error: txError } = await supabaseAdmin
      .from("transactions")
      .select("id, created_at, amount, credits, package_name, status, stripe_session_id, unlimited_credits")
      .eq("user_id", user.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100);

    if (txError) {
      return new Response(JSON.stringify({ error: txError.message }), { status: 500, headers });
    }

    if (!txs?.length) {
      return new Response(JSON.stringify({ invoices: [] }), { status: 200, headers });
    }

    // HIGH-03: look up customer ID from profiles for Checkout session list (receipts / PDFs)
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    let customerId = profile?.stripe_customer_id as string | undefined;

    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await supabaseAdmin
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("user_id", user.id);
      }
    }

    const sessionById = new Map<string, Stripe.Checkout.Session>();
    if (customerId) {
      const sessions = await stripe.checkout.sessions.list({
        customer: customerId,
        limit: 100,
        expand: ["data.invoice"],
      });
      for (const s of sessions.data) {
        sessionById.set(s.id, s);
      }
    }

    const formattedInvoices = txs.map((tx) => {
      const session = tx.stripe_session_id ? sessionById.get(tx.stripe_session_id) : undefined;
      const inv = session?.invoice;
      const invoiceObj =
        inv && typeof inv === "object" && "currency" in inv ? (inv as Stripe.Invoice) : null;
      const created = Math.floor(new Date(tx.created_at).getTime() / 1000);
      return {
        id: tx.stripe_session_id ?? tx.id,
        number: invoiceObj?.number ?? null,
        amount: Number(tx.amount),
        currency: invoiceObj?.currency ?? "usd",
        status: invoiceObj?.status ?? "paid",
        created,
        description: tx.unlimited_credits
          ? `${tx.package_name} (Unlimited)`
          : `${tx.package_name} (${tx.credits} credits)`,
        pdf_url: invoiceObj?.invoice_pdf ?? null,
        hosted_url: invoiceObj?.hosted_invoice_url ?? null,
      };
    });

    return new Response(JSON.stringify({ invoices: formattedInvoices }), { status: 200, headers });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers });
  }
});
