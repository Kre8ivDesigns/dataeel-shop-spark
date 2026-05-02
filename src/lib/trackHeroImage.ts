import { extractCanonicalTrackCode } from "@/lib/racetracks";

const TRACK_HERO_IMAGES = import.meta.glob("../assets/track-hero/track-hero-*.png", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

const GENERIC_TRACK_HERO_IMAGES = [
  TRACK_HERO_IMAGES["../assets/track-hero/track-hero-generic-dirt.png"],
  TRACK_HERO_IMAGES["../assets/track-hero/track-hero-generic-turf.png"],
  TRACK_HERO_IMAGES["../assets/track-hero/track-hero-generic-weather.png"],
].filter(Boolean);

function heroKey(trackCode: string | null | undefined): string {
  const canon = extractCanonicalTrackCode(trackCode);
  return canon.toLowerCase();
}

function fallbackIndex(key: string): number {
  if (GENERIC_TRACK_HERO_IMAGES.length === 0) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash + key.charCodeAt(i)) % GENERIC_TRACK_HERO_IMAGES.length;
  }
  return hash;
}

export function getTrackHeroImage(trackCode: string | null | undefined): string | null {
  const key = heroKey(trackCode);
  const knownTrackImage = TRACK_HERO_IMAGES[`../assets/track-hero/track-hero-${key}.png`];
  if (knownTrackImage) return knownTrackImage;
  return GENERIC_TRACK_HERO_IMAGES[fallbackIndex(key)] ?? null;
}
