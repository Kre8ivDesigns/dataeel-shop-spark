/**
 * Proxies Equibase public static late-changes RSS (scratches, track condition, etc.).
 * Track code via secret EQUIBASE_LATE_CHANGES_BRN (default KD-USA), e.g. GP-USA, SA-USA.
 * https://www.equibase.com/static/latechanges/rss/KD-USA.rss
 */
import { getCorsHeaders } from "../_shared/cors.ts";

const BASE = "https://www.equibase.com/static/latechanges/rss";

function normalizeBrn(raw: string): string | null {
  const s = raw.trim();
  if (!/^[A-Z0-9]+-[A-Z]{2,8}$/i.test(s) || s.length > 24) return null;
  const [track, country] = s.split("-");
  return `${track.toUpperCase()}-${country.toUpperCase()}`;
}

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

  const brn = normalizeBrn(Deno.env.get("EQUIBASE_LATE_CHANGES_BRN") ?? "KD-USA");
  if (!brn) {
    return new Response(JSON.stringify({ error: "Invalid EQUIBASE_LATE_CHANGES_BRN" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const url = `${BASE}/${encodeURIComponent(brn)}.rss`;

  try {
    const upstream = await fetch(url, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
        "User-Agent": "DataeelShop/1.0 (+https://www.dataeel.com; Equibase RSS reader)",
      },
    });
    if (!upstream.ok) {
      return new Response(
        JSON.stringify({ error: "Upstream feed unavailable", status: upstream.status }),
        { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const xml = await upstream.text();
    return new Response(xml, {
      status: 200,
      headers: {
        ...cors,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
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
