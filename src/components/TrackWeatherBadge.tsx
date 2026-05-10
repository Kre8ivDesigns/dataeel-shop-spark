import { Clock, CloudSun, Wind } from "lucide-react";
import { formatTrackLocalTime, useTrackWeather } from "@/lib/queries/trackWeather";
import { getRacetrackWeatherLocation } from "@/lib/racetracks";
import type { RacetrackProfile } from "@/lib/queries/racetrackProfiles";

type Props = {
  trackCode: string;
  profile?: RacetrackProfile | null;
  compact?: boolean;
};

export function TrackWeatherBadge({ trackCode, profile, compact = false }: Props) {
  const fallbackLocation = getRacetrackWeatherLocation(trackCode);
  const timezone = profile?.timezone ?? fallbackLocation?.timezone ?? null;
  const localTime = formatTrackLocalTime(timezone);
  const { data, isLoading } = useTrackWeather(trackCode, profile);

  const weatherText =
    isLoading ? "Weather loading" :
    data?.temperatureF != null ? `${data.temperatureF}°F · ${data.condition}` :
    "Weather unavailable";
  const windText = data?.windMph != null ? `${data.windMph} mph` : null;

  return (
    <div className={`rounded-lg bg-muted/45 border border-border/70 ${compact ? "px-2.5 py-2" : "px-3 py-2"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {localTime ?? "Local time unavailable"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CloudSun className="h-3.5 w-3.5 text-primary" />
          {weatherText}
        </span>
        {windText && (
          <span className="inline-flex items-center gap-1.5">
            <Wind className="h-3.5 w-3.5 text-primary" />
            {windText}
          </span>
        )}
      </div>
    </div>
  );
}
