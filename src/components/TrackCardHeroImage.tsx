import { useState, useEffect } from "react";
import { ImageIcon } from "lucide-react";
import { extractCanonicalTrackCode } from "@/lib/racetracks";
import { getTrackHeroImage } from "@/lib/trackHeroImage";

type Props = {
  trackCode: string | null | undefined;
  className?: string;
};

/** Local racetrack hero image matched by canonical track code. */
export function TrackCardHeroImage({ trackCode, className = "" }: Props) {
  const [imgBroken, setImgBroken] = useState(false);
  const canon = extractCanonicalTrackCode(trackCode);

  useEffect(() => {
    setImgBroken(false);
  }, [canon]);

  const url = !imgBroken ? getTrackHeroImage(trackCode) : null;
  const showImg = Boolean(url);

  return (
    <div className={`relative w-full overflow-hidden rounded-t-xl bg-muted/40 ${className}`}>
      <div className="aspect-[16/10] w-full relative">
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

        {!showImg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted/90 to-muted/50">
            <ImageIcon className="h-8 w-8 text-muted-foreground/50" aria-hidden />
            <span className="text-[10px] text-muted-foreground/80 px-4 text-center">
              Track image unavailable
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
