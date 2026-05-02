import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { extractCanonicalTrackCode } from "@/lib/racetracks";
import { trackHeroImageSearchQuery, type TrackImageSearchResponse } from "@/lib/trackHeroImage";

const QUERY_ROOT = ["track-hero-image"] as const;

async function fetchTrackImage(trackCode: string | null | undefined): Promise<TrackImageSearchResponse> {
  const query = trackHeroImageSearchQuery(trackCode);
  const { data, error } = await supabase.functions.invoke<TrackImageSearchResponse>("track-image-search", {
    body: { query },
  });
  if (error) {
    return { url: null, reason: "invoke_error", error: error.message };
  }
  return data ?? { url: null, reason: "empty" };
}

type Props = {
  trackCode: string | null | undefined;
  className?: string;
};

/**
 * Wikimedia Commons–sourced hero photo for a racetrack card (search query from track code).
 */
export function TrackCardHeroImage({ trackCode, className = "" }: Props) {
  const [imgBroken, setImgBroken] = useState(false);
  const canon = extractCanonicalTrackCode(trackCode);

  useEffect(() => {
    setImgBroken(false);
  }, [canon]);

  const { data, isLoading, isError } = useQuery({
    queryKey: [...QUERY_ROOT, canon || String(trackCode ?? "").slice(0, 32)],
    queryFn: () => fetchTrackImage(trackCode),
    staleTime: 7 * 24 * 60 * 60 * 1000,
    gcTime: 14 * 24 * 60 * 60 * 1000,
    retry: 1,
    enabled: Boolean(trackCode != null && String(trackCode).trim()),
  });

  const url = data?.url && !imgBroken ? data.url : null;
  const pageUrl = data?.pageUrl ?? null;
  const showImg = Boolean(url) && !isLoading;
  const showPlaceholder = !isLoading && (!showImg || isError);

  return (
    <div className={`relative w-full overflow-hidden rounded-t-xl bg-muted/40 ${className}`}>
      <div className="aspect-[16/10] w-full relative">
        {isLoading && (
          <div className="absolute inset-0 z-[1] flex items-center justify-center bg-muted/50">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        )}

        {showImg && (
          <img
            src={url!}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgBroken(true)}
          />
        )}

        {showPlaceholder && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/90 to-muted/50">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <span className="text-[10px] text-muted-foreground/80 px-4 text-center">
              {isError ? "Image lookup failed" : "No photo found for this track"}
            </span>
          </div>
        )}
      </div>

      {pageUrl && showImg ? (
        <a
          href={pageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-0 left-0 right-0 z-[2] bg-background/85 px-2 py-1 text-[9px] text-muted-foreground hover:text-foreground truncate backdrop-blur-sm border-t border-border/60"
        >
          Photo: Wikimedia Commons
        </a>
      ) : null}
    </div>
  );
}
