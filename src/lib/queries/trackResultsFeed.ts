import { useQuery } from "@tanstack/react-query";
import { parseRss2Items, type Rss2Item } from "@/lib/parseRss2Xml";
import { canonicalizeResultsTrackCode } from "@/lib/resultsTracks";

export type TrackResultsFeedData = {
  trackCode: string;
  items: Rss2Item[];
};

async function fetchTrackResultsFeed(trackCode: string, limit = 30): Promise<TrackResultsFeedData> {
  const canonical = canonicalizeResultsTrackCode(trackCode);
  if (!canonical) throw new Error("Invalid track code");
  const base = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "");
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) {
    throw new Error("Missing Supabase env");
  }

  const response = await fetch(`${base}/functions/v1/track-results-rss?track=${encodeURIComponent(canonical)}&limit=${limit}`, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });
  if (!response.ok) {
    throw new Error(`Race results feed request failed: ${response.status}`);
  }
  const xml = await response.text();
  return {
    trackCode: canonical,
    items: parseRss2Items(xml, limit),
  };
}

export function useTrackResultsFeed(trackCode: string, limit = 30) {
  const canonical = canonicalizeResultsTrackCode(trackCode);
  return useQuery({
    queryKey: ["track-results-feed", canonical ?? "invalid", limit],
    queryFn: () => fetchTrackResultsFeed(canonical!, limit),
    enabled: !!canonical,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    retry: 1,
  });
}
