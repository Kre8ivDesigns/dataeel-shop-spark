import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { getCorsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return respond({ error: "Unauthorized" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr || !user) return respond({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseAdmin.rpc("is_admin", { _user_id: user.id });
    if (!isAdmin) return respond({ error: "Forbidden" }, 403);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

    const body = await req.json();
    const { action } = body;

    // ── CREATE ────────────────────────────────────────────────────────────
    if (action === "create") {
      const { name, description, credits, price } = body;
      if (!name || !credits || !price) {
        return respond({ error: "name, credits, and price are required" }, 400);
      }

      const unitAmount = Math.round(Number(price) * 100);
      if (unitAmount <= 0) return respond({ error: "Price must be greater than 0" }, 400);

      if (!stripeKey) return respond({ error: "STRIPE_SECRET_KEY is not configured. Cannot create credit package with Stripe integration." }, 500);
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      // Create Stripe product
      const product = await stripe.products.create({
        name,
        description: description || undefined,
      });

      // Create Stripe price (one-time payment)
      const stripePrice = await stripe.prices.create({
        product: product.id,
        unit_amount: unitAmount,
        currency: "usd",
      });

      // Insert into DB
      const { data: pkg, error: dbErr } = await supabaseAdmin
        .from("credit_packages")
        .insert({ name, description: description || null, credits: Number(credits), price: Number(price), stripe_price_id: stripePrice.id })
        .select()
        .single();

      if (dbErr) {
        // Roll back Stripe objects if DB insert fails
        await stripe.prices.update(stripePrice.id, { active: false });
        await stripe.products.update(product.id, { active: false });
        return respond({ error: dbErr.message }, 500);
      }

      return respond({ package: pkg });
    }

    // ── UPDATE ────────────────────────────────────────────────────────────
    if (action === "update") {
      const { packageId, name, description, credits, price } = body;
      if (!packageId) return respond({ error: "packageId is required" }, 400);

      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from("credit_packages")
        .select("*")
        .eq("id", packageId)
        .single();

      if (fetchErr || !existing) return respond({ error: "Package not found" }, 404);

      if (!stripeKey) return respond({ error: "STRIPE_SECRET_KEY is not configured. Cannot update credit package with Stripe integration." }, 500);
      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

      const unitAmount = Math.round(Number(price) * 100);
      let newPriceId: string = existing.stripe_price_id;

      if (existing.stripe_price_id) {
        // Retrieve existing Stripe price to find the product
        const existingStripePrice = await stripe.prices.retrieve(existing.stripe_price_id);
        const productId = existingStripePrice.product as string;

        // Update product name/description
        await stripe.products.update(productId, {
          name,
          description: description || undefined,
        });

        // Prices are immutable — archive old and create new if amount changed
        if (existingStripePrice.unit_amount !== unitAmount) {
          await stripe.prices.update(existing.stripe_price_id, { active: false });
          const newStripePrice = await stripe.prices.create({
            product: productId,
            unit_amount: unitAmount,
            currency: "usd",
          });
          newPriceId = newStripePrice.id;
        }
      } else {
        // No existing Stripe price — create from scratch
        const product = await stripe.products.create({ name, description: description || undefined });
        const newStripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: unitAmount,
          currency: "usd",
        });
        newPriceId = newStripePrice.id;
      }

      const { data: updated, error: updateErr } = await supabaseAdmin
        .from("credit_packages")
        .update({
          name,
          description: description || null,
          credits: Number(credits),
          price: Number(price),
          stripe_price_id: newPriceId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", packageId)
        .select()
        .single();

      if (updateErr) return respond({ error: updateErr.message }, 500);
      return respond({ package: updated });
    }

    // ── DELETE ────────────────────────────────────────────────────────────
    if (action === "delete") {
      const { packageId } = body;
      if (!packageId) return respond({ error: "packageId is required" }, 400);

      const { data: existing } = await supabaseAdmin
        .from("credit_packages")
        .select("stripe_price_id")
        .eq("id", packageId)
        .single();

      if (existing?.stripe_price_id) {
        // Best-effort: archive the Stripe price/product. Errors are logged but
        // never block the database deletion so the package is always removed.
        if (stripeKey) {
          try {
            const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
            const stripePrice = await stripe.prices.retrieve(existing.stripe_price_id);
            await stripe.prices.update(existing.stripe_price_id, { active: false });
            await stripe.products.update(stripePrice.product as string, { active: false });
          } catch (stripeErr) {
            console.error("Stripe archive error:", stripeErr);
          }
        } else {
          console.warn("STRIPE_SECRET_KEY not set — skipping Stripe archive for deleted package");
        }
      }

      const { error: deleteErr } = await supabaseAdmin
        .from("credit_packages")
        .delete()
        .eq("id", packageId);

      if (deleteErr) return respond({ error: deleteErr.message }, 500);
      return respond({ deleted: true });
    }

    return respond({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
    console.error("manage-credit-package error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return respond({ error: msg }, 500);
  }
});
