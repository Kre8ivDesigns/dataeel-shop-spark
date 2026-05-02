/**
 * Proxies America's Best Racing "The Sport" RSS so the browser can read it without CORS issues.
 * Fixed URL only — not a generic open proxy.
 */
import { getCorsHeaders } from "../_shared/cors.ts";

/** Drupal serves HTML at /the-sport/rss; the real feed is /rss/the-sport (see page &lt;link rel="alternate" type="application/rss+xml"&gt;). */
const ABR_THE_SPORT_RSS = "https://www.americasbestracing.net/rss/the-sport";

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const upstream = await fetch(ABR_THE_SPORT_RSS, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "DataeelShop/1.0 (+https://www.dataeel.com; RSS reader)",
      },
    });
    if (!upstream.ok) {
      return new Response(JSON.stringify({ error: "Upstream feed unavailable", status: upstream.status }), {
        status: 502,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const xml = await upstream.text();
    return new Response(xml, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=900",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "fetch failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
