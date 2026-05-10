import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, CreditCard, ExternalLink, Lock, MapPin, Trophy } from "lucide-react";
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
  | "id"
  | "track_name"
  | "track_code"
  | "race_date"
  | "num_races"
  | "metadata"
  | "digitization_status"
  | "digitization_error"
>;
type Prediction = Tables<"racecard_predictions">;
type RaceResult = {
  id: string;
  race_number: number;
  result_title: string;
  result_summary: string | null;
  result_description: string | null;
  source_url: string;
};
type OfficialFinisher = { horseNumber: string | null; horseName: string };
type PickNotification = {
  key: string;
  raceNumber: number;
  algorithm: string;
  hitType: "Winner" | "Exacta" | "Trifecta";
  horses: OfficialFinisher[];
};

function publicRacecardToRacecard(row: {
  id: string;
  track_name: string;
  track_code: string;
  race_date: string;
  num_races: number | null;
  metadata: Tables<"racecards">["metadata"];
}): Racecard {
  return {
    ...row,
    digitization_status: "not_started",
    digitization_error: null,
  };
}

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

function groupResults(results: RaceResult[]) {
  return results.reduce<Record<number, RaceResult[]>>((acc, result) => {
    acc[result.race_number] = [...(acc[result.race_number] ?? []), result];
    return acc;
  }, {});
}

function normalizeProgramNumber(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeHorseName(value: string | null | undefined): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(?:FR|GB|IRE|JPN|ARG|BRZ|CHI|AUS|CAN)\b/g, " ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFinisherText(value: string): OfficialFinisher | null {
  const finisherText = value
    .replace(/\$[\d,.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const parsed = /^([A-Z0-9]+)\s+(.+)$/i.exec(finisherText);
  if (!parsed) {
    return finisherText ? { horseNumber: null, horseName: finisherText } : null;
  }

  return {
    horseNumber: normalizeProgramNumber(parsed[1]) || null,
    horseName: parsed[2].trim(),
  };
}

function parseOfficialFinishers(result: RaceResult): OfficialFinisher[] {
  const source = result.result_summary || result.result_description || "";
  const finishers: OfficialFinisher[] = [];
  const re = /\b(1st|2nd|3rd):\s*([^;\n]+)/gi;
  for (const match of source.matchAll(re)) {
    const finisher = parseFinisherText(match[2]);
    if (finisher) finishers.push(finisher);
  }
  return finishers;
}

function didPickMatch(pick: Prediction, finisher: OfficialFinisher): boolean {
  const pickNumber = normalizeProgramNumber(pick.horse_number);
  if (finisher.horseNumber && pickNumber && finisher.horseNumber === pickNumber) return true;
  return normalizeHorseName(pick.horse_name) === normalizeHorseName(finisher.horseName);
}

function didPicksMatchFinishOrder(picks: Prediction[], finishers: OfficialFinisher[], count: number): boolean {
  if (picks.length < count || finishers.length < count) return false;
  return Array.from({ length: count }, (_, idx) => didPickMatch(picks[idx], finishers[idx])).every(Boolean);
}

function findPickNotifications(predictions: Prediction[], results: RaceResult[]): PickNotification[] {
  const predictionsByRace = groupPredictions(predictions);
  const resultsByRace = groupResults(results);
  const hits: PickNotification[] = [];
  const hitTypes: Array<{ label: PickNotification["hitType"]; count: number }> = [
    { label: "Winner", count: 1 },
    { label: "Exacta", count: 2 },
    { label: "Trifecta", count: 3 },
  ];

  for (const [raceNumberText, raceResults] of Object.entries(resultsByRace)) {
    const raceNumber = Number(raceNumberText);
    const finishers = raceResults.map(parseOfficialFinishers).find((value) => value.length > 0) ?? [];
    if (finishers.length === 0) continue;

    const byAlgorithm = predictionsByRace[raceNumber] ?? {};
    for (const algorithm of ["Concert", "Aptitude"]) {
      const rankedPicks = [...(byAlgorithm[algorithm] ?? [])].sort((a, b) => a.rank - b.rank);
      for (const hitType of hitTypes) {
        if (didPicksMatchFinishOrder(rankedPicks, finishers, hitType.count)) {
          hits.push({
            key: `${raceNumber}-${algorithm}-${hitType.label}`,
            raceNumber,
            algorithm,
            hitType: hitType.label,
            horses: finishers.slice(0, hitType.count),
          });
        }
      }
    }
  }

  return hits.sort(
    (a, b) =>
      a.raceNumber - b.raceNumber ||
      a.algorithm.localeCompare(b.algorithm) ||
      a.horses.length - b.horses.length,
  );
}

function formatRaceDate(value: string | null | undefined): string {
  if (!value) return "Race date unavailable";
  try {
    return format(parseISO(value), "MMMM d, yyyy");
  } catch {
    return value;
  }
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
        .from("racecards_public")
        .select("id, track_name, track_code, race_date, num_races, metadata")
        .eq("id", racecardId!)
        .maybeSingle();
      if (error) throw error;
      return data ? publicRacecardToRacecard(data) : null;
    },
    enabled: !!racecardId,
  });

  const canonicalTrackCode = extractCanonicalTrackCode(racecard?.track_code);

  const { data: hasDownload = false, isLoading: ownershipLoading } = useQuery({
    queryKey: ["racecard-ownership", user?.id, canonicalTrackCode, racecard?.race_date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("racecard_downloads")
        .select("id, racecards!inner(track_code, race_date)")
        .eq("user_id", user!.id)
        .eq("racecards.race_date", racecard!.race_date)
        .limit(50);
      if (error) throw error;
      return (data ?? []).some((row) => {
        const purchased = row.racecards as { track_code: string | null } | null;
        return extractCanonicalTrackCode(purchased?.track_code) === canonicalTrackCode;
      });
    },
    enabled: !!user && !!canonicalTrackCode && !!racecard?.race_date,
  });

  const unlocked = isAdmin || hasDownload;

  const { data: protectedRacecard } = useQuery({
    queryKey: ["racecard-protected-detail", racecardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("racecards")
        .select("id, track_name, track_code, race_date, num_races, metadata, digitization_status, digitization_error")
        .eq("id", racecardId!)
        .maybeSingle();
      if (error) throw error;
      return data as Racecard | null;
    },
    enabled: !!racecardId && unlocked,
  });

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

  const { data: raceResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["race-results", canonicalTrackCode, racecard?.race_date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("race_results" as never)
        .select("id, race_number, result_title, result_summary, result_description, source_url")
        .eq("track_code", canonicalTrackCode)
        .eq("race_date", racecard!.race_date)
        .order("race_number", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as RaceResult[];
    },
    enabled: !!user && !!racecard && !!canonicalTrackCode,
  });

  const digitalRacecard = protectedRacecard ?? racecard;
  const meta = useMemo(() => parseRacecardMetadata(digitalRacecard?.metadata), [digitalRacecard?.metadata]);
  const predictionGroups = useMemo(() => groupPredictions(predictions), [predictions]);
  const resultGroups = useMemo(() => groupResults(raceResults), [raceResults]);
  const pickNotifications = useMemo(
    () => (unlocked ? findPickNotifications(predictions, raceResults) : []),
    [predictions, raceResults, unlocked],
  );
  const raceRows = useMemo(() => {
    if (!unlocked) {
      const resultRaceNumbers = Array.from(
        new Set(raceResults.map((result) => result.race_number).filter((raceNumber) => raceNumber > 0)),
      ).sort((a, b) => a - b);
      return resultRaceNumbers.map((number) => ({ number }));
    }

    const metadataRows = buildRaceRows(meta, digitalRacecard?.num_races ?? null);
    if (metadataRows.length > 0) return metadataRows;

    const predictionRaceNumbers = Array.from(
      new Set([
        ...predictions.map((prediction) => prediction.race_number),
        ...raceResults.map((result) => result.race_number),
      ].filter((raceNumber) => raceNumber > 0)),
    ).sort((a, b) => a - b);
    return predictionRaceNumbers.map((number) => ({ number }));
  }, [meta, predictions, raceResults, digitalRacecard?.num_races, unlocked]);
  const trackProfile = canonicalTrackCode ? profileByCode[canonicalTrackCode] ?? null : null;
  const trackWebsite = trackProfile?.official_url ?? getRacetrackWebsite(racecard?.track_code);
  const location = getRacetrackLocation(racecard?.track_code);
  const title = racecard ? (trackProfile?.display_name ?? getRacetrackLabel(racecard.track_code)) : "RaceCard";
  const raceDateDisplay = formatRaceDate(racecard?.race_date);
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
          subtitle={racecard ? `${raceDateDisplay}${metadataListingLine(meta) ? ` · ${metadataListingLine(meta)}` : ""}` : "Loading RaceCard"}
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
                        {raceDateDisplay}
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
                      <Button asChild className="mt-3 bg-primary text-primary-foreground font-semibold">
                        <Link to="/racecards">
                          <CreditCard className="mr-2 h-4 w-4" />
                          Purchase RaceCard
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
                <TrackWeatherBadge trackCode={racecard.track_code} profile={trackProfile} />
              </section>

              {pickNotifications.length > 0 && (
                <section className="rounded-xl border border-primary/45 bg-primary/10 p-5 shadow-[0_0_28px_hsl(var(--primary)/0.12)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold uppercase tracking-wide text-primary">
                          Winning results
                        </div>
                        <h2 className="mt-1 font-heading text-xl font-bold text-foreground">
                          DATAEEL picks matched official payouts
                        </h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Official results are posted for this card and these selections matched the finish order.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 lg:max-w-[55%] lg:justify-end">
                      {pickNotifications.map((hit) => (
                        <div
                          key={hit.key}
                          className="rounded-full border border-primary/35 bg-background/70 px-3 py-1.5 text-sm font-semibold text-foreground"
                        >
                          {hit.algorithm} {hit.hitType} Race {hit.raceNumber}:{" "}
                          <span className="text-primary">
                            {hit.horses
                              .map((horse) => `${horse.horseNumber ? `${horse.horseNumber} ` : ""}${horse.horseName}`)
                              .join(" / ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                {raceRows.length === 0 ? (
                  <div className="card-dark p-6 text-sm text-muted-foreground">
                    {unlocked && predictionsLoading
                      ? "Loading DATAEEL selections..."
                      : resultsLoading
                      ? "Loading race results..."
                      : unlocked
                      ? racecard.digitization_status === "not_started" || racecard.digitization_status === "queued"
                        ? "This RaceCard has not been digitized yet. Results will appear here once they are posted."
                        : racecard.digitization_status === "needs_review"
                        ? "This RaceCard needs digitization review before digital selections can be shown."
                        : "Digital selections and race results are not posted for this RaceCard yet."
                      : "Race details are not posted yet. Check the official track website for the latest schedule."}
                  </div>
                ) : (
                  raceRows.map((race) => {
                    const byAlgorithm = predictionGroups[race.number ?? 0] ?? {};
                    const resultsForRace = resultGroups[race.number ?? 0] ?? [];
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
                        {resultsForRace.length > 0 && (
                          <div className="mt-5 rounded-lg border border-primary/25 bg-primary/5 p-4">
                            <div className="text-sm font-bold text-foreground">Official results</div>
                            <div className="mt-3 space-y-2">
                              {resultsForRace.map((result) => (
                                <a
                                  key={result.id}
                                  href={result.source_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block rounded-md bg-background/50 px-3 py-2 text-sm hover:bg-background/70"
                                >
                                  <div className="font-semibold text-foreground">{result.result_title}</div>
                                  {(result.result_summary || result.result_description) && (
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      {result.result_summary || result.result_description}
                                    </div>
                                  )}
                                </a>
                              ))}
                            </div>
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
