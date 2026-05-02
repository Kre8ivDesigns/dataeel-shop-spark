/**
 * Searches Wikimedia Commons for a representative racetrack photo (fixed-purpose proxy).
 * POST JSON { query: string } — caller builds query from track label + location (see src/lib/trackHeroImage.ts).
 */
import { getCorsHeaders } from "../_shared/cors.ts";

const MAX_QUERY_LEN = 140;
const UA = "DataeelShop/1.0 (track imagery for racecards; +https://www.thedataeel.com)";

function stripTrackingParams(u: string): string {
  try {
    const x = new URL(u);
    x.search = "";
    return x.toString();
  } catch {
    return u.split("?")[0] ?? u;
  }
}

type WikimediaQueryJson = {
  query?: {
    pages?: Record<
      string,
      {
        title?: string;
        imageinfo?: Array<{
          thumburl?: string;
          url?: string;
          descriptionurl?: string;
          descriptionshorturl?: string;
        }>;
      }
    >;
  };
};

function pickImage(parsed: WikimediaQueryJson): { imageUrl: string; pageUrl: string | null } | null {
  const pages = parsed.query?.pages;
  if (!pages || typeof pages !== "object") return null;
  for (const p of Object.values(pages)) {
    const ii = p.imageinfo?.[0];
    const raw = ii?.thumburl ?? ii?.url;
    if (typeof raw !== "string" || !raw.startsWith("http")) continue;
    const pageUrl =
      typeof ii.descriptionurl === "string"
        ? ii.descriptionurl
        : typeof ii.descriptionshorturl === "string"
          ? ii.descriptionshorturl
          : null;
    return { imageUrl: stripTrackingParams(raw), pageUrl };
  }
  return null;
}

async function searchCommons(searchQuery: string): Promise<{ imageUrl: string; pageUrl: string | null } | null> {
  const apiUrl =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search` +
    `&gsrsearch=${encodeURIComponent(searchQuery)}&gsrnamespace=6&gsrlimit=1&prop=imageinfo` +
    `&iiprop=url|dimensions&iiurlwidth=640`;

  const res = await fetch(apiUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": UA,
    },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as WikimediaQueryJson;
  return pickImage(json);
}

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: { query?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const raw = (body.query ?? "").trim().slice(0, MAX_QUERY_LEN);
  if (raw.length < 4) {
    return new Response(JSON.stringify({ url: null, pageUrl: null, source: "wikimedia", reason: "query_too_short" }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  }

  try {
    let hit = await searchCommons(raw);
    if (!hit) {
      const shorter = raw.replace(/\s+/g, " ").split(" ").slice(0, 4).join(" ") + " racing";
      if (shorter !== raw) hit = await searchCommons(shorter);
    }

    if (!hit) {
      return new Response(JSON.stringify({ url: null, pageUrl: null, source: "wikimedia", reason: "no_results" }), {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" },
      });
    }

    return new Response(
      JSON.stringify({
        url: hit.imageUrl,
        pageUrl: hit.pageUrl,
        source: "wikimedia",
      }),
      {
        status: 200,
        headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "public, max-age=86400" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "lookup failed";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
