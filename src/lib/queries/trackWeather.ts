import { useQuery } from "@tanstack/react-query";
import { getRacetrackWeatherLocation } from "@/lib/racetracks";
import type { RacetrackProfile } from "@/lib/queries/racetrackProfiles";

type OpenMeteoCurrent = {
  time?: string;
  temperature_2m?: number;
  wind_speed_10m?: number;
  weather_code?: number;
};

type OpenMeteoResponse = {
  current?: OpenMeteoCurrent;
};

export type TrackWeatherSnapshot = {
  temperatureF: number | null;
  windMph: number | null;
  weatherCode: number | null;
  condition: string;
  observedAt: string | null;
};

const WEATHER_STALE_MS = 10 * 60 * 1000;
const WEATHER_GC_MS = 30 * 60 * 1000;

const WEATHER_CODE_LABELS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Light showers",
  81: "Showers",
  82: "Heavy showers",
  95: "Thunderstorm",
};

function weatherCodeLabel(code: number | null): string {
  if (code === null) return "Weather unavailable";
  return WEATHER_CODE_LABELS[code] ?? "Current weather";
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function formatTrackLocalTime(timezone: string | null | undefined, now = new Date()): string | null {
  if (!timezone) return null;
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: timezone,
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(now);
  } catch {
    return null;
  }
}

function resolveWeatherLocation(trackCode: string, profile?: RacetrackProfile | null) {
  const latitude = parseCoordinate(profile?.latitude);
  const longitude = parseCoordinate(profile?.longitude);
  if (latitude !== null && longitude !== null && profile?.timezone) {
    return {
      latitude,
      longitude,
      timezone: profile.timezone,
    };
  }
  return getRacetrackWeatherLocation(trackCode);
}

export async function fetchTrackWeather(trackCode: string, profile?: RacetrackProfile | null): Promise<TrackWeatherSnapshot | null> {
  const location = resolveWeatherLocation(trackCode, profile);
  if (!location) return null;

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,weather_code,wind_speed_10m",
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    timezone: location.timezone,
    forecast_days: "1",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!res.ok) throw new Error(`Weather unavailable (${res.status})`);
  const json = (await res.json()) as OpenMeteoResponse;
  const current = json.current;
  if (!current) return null;
  const weatherCode = typeof current.weather_code === "number" ? current.weather_code : null;
  return {
    temperatureF: typeof current.temperature_2m === "number" ? Math.round(current.temperature_2m) : null,
    windMph: typeof current.wind_speed_10m === "number" ? Math.round(current.wind_speed_10m) : null,
    weatherCode,
    condition: weatherCodeLabel(weatherCode),
    observedAt: current.time ?? null,
  };
}

export function useTrackWeather(trackCode: string | null | undefined, profile?: RacetrackProfile | null) {
  const location = trackCode ? resolveWeatherLocation(trackCode, profile) : null;
  return useQuery({
    queryKey: ["track-weather", trackCode, profile?.updated_at ?? "fallback"],
    queryFn: () => fetchTrackWeather(trackCode!, profile),
    enabled: !!trackCode && !!location,
    staleTime: WEATHER_STALE_MS,
    gcTime: WEATHER_GC_MS,
    retry: 1,
  });
}
