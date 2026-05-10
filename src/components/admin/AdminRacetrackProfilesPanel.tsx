import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { profilesByTrackCode, type RacetrackProfile, useRacetrackProfiles } from "@/lib/queries/racetrackProfiles";
import { RACETRACK_BY_CODE, extractCanonicalTrackCode, getRacetrackLabel } from "@/lib/racetracks";

type DraftProfile = {
  track_code: string;
  display_name: string;
  official_url: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

function profileToDraft(trackCode: string, profile?: RacetrackProfile | null): DraftProfile {
  return {
    track_code: trackCode,
    display_name: profile?.display_name ?? getRacetrackLabel(trackCode),
    official_url: profile?.official_url ?? "",
    latitude: profile?.latitude == null ? "" : String(profile.latitude),
    longitude: profile?.longitude == null ? "" : String(profile.longitude),
    timezone: profile?.timezone ?? "",
  };
}

function parseNullableNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error("Latitude and longitude must be valid numbers.");
  }
  return parsed;
}

function validateUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const url = new URL(trimmed);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Official URL must start with http:// or https://.");
  }
  return url.toString();
}

export function AdminRacetrackProfilesPanel() {
  const queryClient = useQueryClient();
  const { data: profiles = [], isLoading } = useRacetrackProfiles();
  const [drafts, setDrafts] = useState<Record<string, DraftProfile>>({});
  const [savingTrack, setSavingTrack] = useState<string | null>(null);

  const trackCodes = useMemo(() => {
    const profileCodes = profiles.map((profile) => extractCanonicalTrackCode(profile.track_code));
    return Array.from(new Set([...Object.keys(RACETRACK_BY_CODE), ...profileCodes])).sort();
  }, [profiles]);

  useEffect(() => {
    const profileMap = profilesByTrackCode(profiles);
    setDrafts((current) => {
      const next = { ...current };
      trackCodes.forEach((trackCode) => {
        if (!next[trackCode]) {
          next[trackCode] = profileToDraft(trackCode, profileMap[trackCode]);
        }
      });
      return next;
    });
  }, [profiles, trackCodes]);

  const updateDraft = (trackCode: string, key: keyof DraftProfile, value: string) => {
    setDrafts((current) => ({
      ...current,
      [trackCode]: {
        ...(current[trackCode] ?? profileToDraft(trackCode)),
        [key]: value,
      },
    }));
  };

  const saveTrack = async (trackCode: string) => {
    const draft = drafts[trackCode] ?? profileToDraft(trackCode);
    setSavingTrack(trackCode);
    try {
      const officialUrl = validateUrl(draft.official_url);
      const latitude = parseNullableNumber(draft.latitude);
      const longitude = parseNullableNumber(draft.longitude);
      const payload = {
        track_code: extractCanonicalTrackCode(draft.track_code),
        display_name: draft.display_name.trim() || getRacetrackLabel(trackCode),
        official_url: officialUrl,
        latitude,
        longitude,
        timezone: draft.timezone.trim() || null,
      };

      const { error } = await supabase
        .from("racetrack_profiles")
        .upsert(payload, { onConflict: "track_code" });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["racetrack-profiles"] });
      toast.success(`${payload.track_code} saved`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save racetrack profile");
    } finally {
      setSavingTrack(null);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground">Racetrack profiles</CardTitle>
        <CardDescription>
          Assign official track URLs and location data used by RaceCards, weather, and local time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {trackCodes.map((trackCode) => {
              const draft = drafts[trackCode] ?? profileToDraft(trackCode);
              const saving = savingTrack === trackCode;
              return (
                <div key={trackCode} className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-mono-data text-sm font-bold text-primary">{trackCode}</div>
                      <div className="text-sm font-semibold text-foreground">{getRacetrackLabel(trackCode)}</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void saveTrack(trackCode)}
                      disabled={saving}
                      className="bg-primary text-primary-foreground font-semibold"
                    >
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label htmlFor={`display-${trackCode}`}>Display name</Label>
                      <Input
                        id={`display-${trackCode}`}
                        value={draft.display_name}
                        onChange={(event) => updateDraft(trackCode, "display_name", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5 xl:col-span-2">
                      <Label htmlFor={`url-${trackCode}`}>Official URL</Label>
                      <Input
                        id={`url-${trackCode}`}
                        value={draft.official_url}
                        placeholder="https://"
                        onChange={(event) => updateDraft(trackCode, "official_url", event.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`timezone-${trackCode}`}>Timezone</Label>
                      <Input
                        id={`timezone-${trackCode}`}
                        value={draft.timezone}
                        placeholder="America/New_York"
                        onChange={(event) => updateDraft(trackCode, "timezone", event.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`lat-${trackCode}`}>Lat</Label>
                        <Input
                          id={`lat-${trackCode}`}
                          value={draft.latitude}
                          inputMode="decimal"
                          onChange={(event) => updateDraft(trackCode, "latitude", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`lng-${trackCode}`}>Lng</Label>
                        <Input
                          id={`lng-${trackCode}`}
                          value={draft.longitude}
                          inputMode="decimal"
                          onChange={(event) => updateDraft(trackCode, "longitude", event.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
