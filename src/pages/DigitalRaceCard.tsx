import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, ExternalLink, Lock, MapPin, Trophy } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { TrackWeatherBadge } from "@/components/TrackWeatherBadge";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { buildRaceRows, metadataListingLine, parseRacecardMetadata } from "@/lib/raceMetadata";
import { profilesByTrackCode, useRacetrackProfiles } from "@/lib/queries/racetrackProfiles";
import { extractCanonicalTrackCode, getRacetrackLabel, getRacetrackLocation, getRacetrackWebsite } from "@/lib/racetracks";

type Racecard = Pick<
  Tables<"racecards">,
  "id" | "track_name" | "track_code" | "race_date" | "num_races" | "metadata"
>;
type Prediction = Tables<"racecard_predictions">;

function algorithmLabel(algorithm: string): string {
  const normalized = algorithm.trim().toLowerCase();
  if (normalized.includes("concert")) return "Concert";
  if (normalized.includes("aptitude")) return "Aptitude";
  return algorithm;
}

function groupPredictions(predictions: Prediction[]) {
  return predictions.reduce<Record<number, Record<string, Prediction[]>>>((acc, prediction) => {
    const raceGroup = acc[prediction.race_number] ?? {};
    const key = algorithmLabel(prediction.algorithm);
    raceGroup[key] = [...(raceGroup[key] ?? []), prediction].sort((a, b) => a.rank - b.rank);
    acc[prediction.race_number] = raceGroup;
    return acc;
  }, {});
}

const DigitalRaceCard = () => {
  const { racecardId } = useParams();
  const { user, isAdmin } = useAuth();
  const { data: racetrackProfiles = [] } = useRacetrackProfiles();
  const profileByCode = useMemo(() => profilesByTrackCode(racetrackProfiles), [racetrackProfiles]);

  const { data: racecard, isLoading: racecardLoading } = useQuery({
    queryKey: ["racecard-detail", racecardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("racecards")
        .select("id, track_name, track_code, race_date, num_races, metadata")
        .eq("id", racecardId!)
        .maybeSingle();
      if (error) throw error;
      return data as Racecard | null;
    },
    enabled: !!racecardId,
  });

  const { data: hasDownload = false, isLoading: ownershipLoading } = useQuery({
    queryKey: ["racecard-ownership", user?.id, racecardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("racecard_downloads")
        .select("id")
        .eq("user_id", user!.id)
        .eq("racecard_id", racecardId!)
        .limit(1);
      if (error) throw error;
      return (data ?? []).length > 0;
    },
    enabled: !!user && !!racecardId,
  });

  const unlocked = isAdmin || hasDownload;

  const { data: predictions = [], isLoading: predictionsLoading } = useQuery({
    queryKey: ["racecard-predictions", racecardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("racecard_predictions")
        .select("*")
        .eq("racecard_id", racecardId!)
        .order("race_number")
        .order("algorithm")
        .order("rank");
      if (error) throw error;
      return (data ?? []) as Prediction[];
    },
    enabled: !!racecardId && unlocked,
  });

  const meta = parseRacecardMetadata(racecard?.metadata);
  const raceRows = buildRaceRows(meta, racecard?.num_races ?? null);
  const predictionGroups = useMemo(() => groupPredictions(predictions), [predictions]);
  const canonicalTrackCode = extractCanonicalTrackCode(racecard?.track_code);
  const trackProfile = canonicalTrackCode ? profileByCode[canonicalTrackCode] ?? null : null;
  const trackWebsite = trackProfile?.official_url ?? getRacetrackWebsite(racecard?.track_code);
  const location = getRacetrackLocation(racecard?.track_code);
  const title = racecard ? (trackProfile?.display_name ?? getRacetrackLabel(racecard.track_code)) : "RaceCard";
  const loading = racecardLoading || ownershipLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
        <PageHero
          backTo="/racecards"
          backLabel="Back to RaceCards"
          badge="Digital RaceCard"
          title={
            <>
              {title} <span className="text-neon">{canonicalTrackCode}</span>
            </>
          }
          subtitle={racecard ? `${racecard.race_date}${metadataListingLine(meta) ? ` · ${metadataListingLine(meta)}` : ""}` : "Loading RaceCard"}
          align="left"
          aside={
            trackWebsite ? (
              <Button asChild variant="outline" className="gap-2 shrink-0 lg:mt-6">
                <a href={trackWebsite} target="_blank" rel="noopener noreferrer">
                  Track website
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            ) : undefined
          }
          asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
          sectionClassName="pb-8"
        />

        <div className="container mx-auto px-4 sm:px-6 pt-8 md:pt-10">
          {loading ? (
            <div className="card-dark p-8 text-center text-muted-foreground">Loading digital RaceCard…</div>
          ) : !racecard ? (
            <div className="card-dark p-8 text-center">
              <h2 className="font-heading text-2xl font-bold text-foreground">RaceCard not found</h2>
              <Button asChild className="mt-5 bg-primary text-primary-foreground">
                <Link to="/racecards">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Browse RaceCards
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="card-dark space-y-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        {racecard.race_date}
                      </span>
                      {location && (
                        <span className="inline-flex items-center gap-1.5">
                          <MapPin className="h-4 w-4 text-primary" />
                          {location.city}, {location.state}
                        </span>
                      )}
                    </div>
                    <h1 className="mt-3 font-heading text-2xl font-bold text-foreground">{title}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Public race schedule, local track conditions, and member-gated DATAEEL analysis.
                    </p>
                  </div>
                  {!unlocked && (
                    <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-foreground">
                      <div className="flex items-center gap-2 font-semibold">
                        <Lock className="h-4 w-4 text-primary" />
                        Purchase required
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        DATAEEL Concert and Aptitude selections unlock after this card is purchased.
                      </p>
                    </div>
                  )}
                </div>
                <TrackWeatherBadge trackCode={racecard.track_code} profile={trackProfile} />
              </section>

              <section className="space-y-3">
                {raceRows.length === 0 ? (
                  <div className="card-dark p-6 text-sm text-muted-foreground">
                    Race details are not posted yet. Check the official track website for the latest schedule.
                  </div>
                ) : (
                  raceRows.map((race) => {
                    const byAlgorithm = predictionGroups[race.number ?? 0] ?? {};
                    return (
                      <article key={race.number} className="card-dark">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div>
                            <h2 className="font-heading text-xl font-bold text-foreground">Race {race.number}</h2>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {[race.post_time_display, race.type, race.distance].filter(Boolean).join(" · ") || "Race details posted with the RaceCard"}
                            </p>
                          </div>
                          {trackWebsite && (
                            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-primary">
                              <a href={trackWebsite} target="_blank" rel="noopener noreferrer">
                                Official track
                                <ExternalLink className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                          )}
                        </div>

                        {!unlocked ? (
                          <div className="mt-5 rounded-lg border border-dashed border-border bg-muted/25 p-5 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2 font-semibold text-foreground">
                              <Lock className="h-4 w-4 text-primary" />
                              DATAEEL selections locked
                            </div>
                            <p className="mt-1">Purchase this RaceCard to view the digital Concert and Aptitude selections.</p>
                            <Button asChild className="mt-4 bg-primary text-primary-foreground font-semibold">
                              <Link to="/racecards">Purchase RaceCard</Link>
                            </Button>
                          </div>
                        ) : predictionsLoading ? (
                          <div className="mt-5 rounded-lg bg-muted/30 p-5 text-sm text-muted-foreground">
                            Loading DATAEEL selections…
                          </div>
                        ) : (
                          <div className="mt-5 grid gap-3 md:grid-cols-2">
                            {["Concert", "Aptitude"].map((algorithm) => {
                              const picks = byAlgorithm[algorithm] ?? [];
                              return (
                                <div key={algorithm} className="rounded-lg border border-border bg-muted/25 p-4">
                                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                                    <Trophy className="h-4 w-4 text-primary" />
                                    {algorithm}
                                  </div>
                                  {picks.length === 0 ? (
                                    <p className="mt-3 text-sm text-muted-foreground">No selections posted yet.</p>
                                  ) : (
                                    <div className="mt-3 space-y-2">
                                      {picks.slice(0, 5).map((pick) => (
                                        <div key={pick.id} className="flex items-center justify-between gap-3 rounded-md bg-background/50 px-3 py-2 text-sm">
                                          <div className="min-w-0">
                                            <div className="font-semibold text-foreground">
                                              {pick.rank}. {pick.horse_number ? `${pick.horse_number} ` : ""}{pick.horse_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {[pick.odds ? `Odds ${pick.odds}` : null, pick.score != null ? `Score ${pick.score}` : null].filter(Boolean).join(" · ")}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })
                )}
              </section>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default DigitalRaceCard;
