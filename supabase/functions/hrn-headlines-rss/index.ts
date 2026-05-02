/**
 * Proxies Horse-Races.net headlines RSS (articles/results mix).
 * Fixed URL only — fallback when OTB results feed is unavailable or empty.
 */
import { getCorsHeaders } from "../_shared/cors.ts";

const HRN_RSS = "http://www.horse-races.net/HRN-rssfeed.xml";

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
    const upstream = await fetch(HRN_RSS, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "DataeelShop/1.0 (+https://www.thedataeel.com; RSS reader)",
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
