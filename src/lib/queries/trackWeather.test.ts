import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTrackWeather } from "./trackWeather";
import type { RacetrackProfile } from "./racetrackProfiles";

describe("fetchTrackWeather", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses racetrack profile coordinates returned as numeric strings", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          time: "2026-05-10T17:30",
          temperature_2m: 74.8,
          weather_code: 2,
          wind_speed_10m: 8.7,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const profile = {
      latitude: "38.2029",
      longitude: "-85.7714",
      timezone: "America/Kentucky/Louisville",
    } as unknown as RacetrackProfile;

    await expect(fetchTrackWeather("CD", profile)).resolves.toMatchObject({
      temperatureF: 75,
      windMph: 9,
      condition: "Partly cloudy",
    });

    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get("latitude")).toBe("38.2029");
    expect(url.searchParams.get("longitude")).toBe("-85.7714");
    expect(url.searchParams.get("timezone")).toBe("America/Kentucky/Louisville");
  });
});
