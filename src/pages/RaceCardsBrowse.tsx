import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Download,
  CreditCard,
  Search,
  Loader2,
  CheckCircle,
  Cloud,
  Sparkles,
  ArrowRight,
  MapPin,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { buildRaceRows, metadataListingLine, parseRacecardMetadata } from "@/lib/raceMetadata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCreditBalance } from "@/lib/queries/creditBalance";
import { EMPTY_CREDIT_SNAPSHOT } from "@/lib/creditDisplay";
import { useRacecardsPublicForDate } from "@/lib/queries/racecardsPublic";
import { racecardDownloadKeys, userDashboardKeys } from "@/lib/queryKeys";
import {
  DEFAULT_RACECARD_DOWNLOAD_TZ,
  getRacecardDownloadUiBlock,
} from "@/lib/racecardDownloadDeadline";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";
import { downloadFromSignedUrl } from "@/lib/downloadSignedUrl";
import { TrackCardHeroImage } from "@/components/TrackCardHeroImage";
import { TrackWeatherBadge } from "@/components/TrackWeatherBadge";
import { PageHero } from "@/components/PageHero";
import { extractCanonicalTrackCode, getRacetrackLabel, getRacetrackLocation, getRacetrackWebsite } from "@/lib/racetracks";
import { profilesByTrackCode, useRacetrackProfiles } from "@/lib/queries/racetrackProfiles";

const RACECARD_DOWNLOAD_TZ =
  import.meta.env.VITE_RACECARD_DOWNLOAD_TZ ?? DEFAULT_RACECARD_DOWNLOAD_TZ;

const RACE_AUTH_REDIRECT = `/auth?redirect=${encodeURIComponent("/racecards")}`;
const RACE_JOIN_REDIRECT = `/auth?mode=signup&redirect=${encodeURIComponent("/racecards")}`;

const RaceCardsBrowse = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(() => new Set());
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const dayTabs = useMemo(() => {
    const today = new Date();
    return [
      { label: `Today ${format(today, "M/d")}`, date: format(today, "yyyy-MM-dd") },
      { label: `Tomorrow ${format(addDays(today, 1), "M/d")}`, date: format(addDays(today, 1), "yyyy-MM-dd") },
      { label: format(addDays(today, 2), "EEE M/d"), date: format(addDays(today, 2), "yyyy-MM-dd") },
    ];
  }, []);

  const selectedDate = dayTabs[selectedDateIndex].date;
  const { data: racecards = [], isLoading: cardsLoading } = useRacecardsPublicForDate(selectedDate);
  const { data: racetrackProfiles = [] } = useRacetrackProfiles();
  const profileByCode = useMemo(() => profilesByTrackCode(racetrackProfiles), [racetrackProfiles]);

  const { data: balanceData, isLoading: balanceLoading } = useCreditBalance(user?.id);
  const balanceSnap = balanceData ?? EMPTY_CREDIT_SNAPSHOT;

  const { data: downloadIds = [] } = useQuery({
    queryKey: user ? racecardDownloadKeys.byUser(user.id) : ["racecard-downloads", "signed-out"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("racecard_downloads")
        .select("racecard_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((d) => d.racecard_id);
    },
    enabled: !!user,
  });

  const downloads = useMemo(() => new Set(downloadIds), [downloadIds]);

  const handleDownload = async (racecardId: string) => {
    if (!user) {
      toast({
        title: "Please sign in",
        description: "You need to be logged in to download racecards.",
        variant: "destructive",
      });
      return;
    }

    setDownloading(racecardId);
    try {
      const { data, error, response: invokeResponse } = await supabase.functions.invoke("download-racecard", {
        body: { racecardId },
      });

      if (error || !data?.signedUrl) {
        const msg = await getInvokeErrorMessage("download-racecard", error, data, invokeResponse);
        toast({ title: "Download failed", description: msg || "Download failed", variant: "destructive" });
        return;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["credit-balance", user.id] }),
        queryClient.invalidateQueries({ queryKey: racecardDownloadKeys.byUser(user.id) }),
        queryClient.invalidateQueries({ queryKey: userDashboardKeys.detail(user.id) }),
      ]);

      const desc = `${data.fileName}`;
      const dl = await downloadFromSignedUrl(data.signedUrl, desc);
      if (dl.status === "failed") {
        toast({
          title: "Download failed",
          description: dl.error,
          variant: "destructive",
        });
        return;
      }
      if (dl.status === "navigate_same_tab") {
        toast({
          title: data.alreadyOwned ? "Re-downloading" : "Downloaded!",
          description: desc,
        });
        window.location.assign(dl.url);
        return;
      }
      toast({ title: data.alreadyOwned ? "Re-downloading" : "Downloaded!", description: desc });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const toggleExpandedCard = (racecardId: string) => {
    setExpandedCardIds((current) => {
      const next = new Set(current);
      if (next.has(racecardId)) {
        next.delete(racecardId);
      } else {
        next.add(racecardId);
      }
      return next;
    });
  };

  const q = searchQuery.toLowerCase();
  const filtered = racecards.filter((card) => {
    const label = getRacetrackLabel(card.track_code).toLowerCase();
    const codeShort = extractCanonicalTrackCode(card.track_code).toLowerCase();
    const rawCode = (card.track_code ?? "").toLowerCase();
    return (
      label.includes(q) ||
      card.track_name.toLowerCase().includes(q) ||
      rawCode.includes(q) ||
      codeShort.includes(q)
    );
  });

  const isOwned = (id: string) => downloads.has(id);
  const loading = cardsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageHero
        title={
          <>
            Race<span className="text-neon">Cards</span>
          </>
        }
        subtitle="Browse what's available by track and date. Signed-in members download PDFs with credits."
        align="left"
        aside={
          user ? (
            <div className="flex items-center gap-3 justify-end lg:pt-1">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card/80 border border-border backdrop-blur-sm">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono-data font-bold text-primary">
                  {balanceLoading ? "—" : balanceSnap.unlimited ? "Unlimited" : balanceSnap.credits}
                </span>
                <span className="text-xs text-muted-foreground">
                  {balanceLoading || balanceSnap.unlimited ? "" : "credits"}
                </span>
              </div>
              <Link to="/buy-credits">
                <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 text-xs">
                  Buy More
                </Button>
              </Link>
            </div>
          ) : undefined
        }
        asideGridClassName="lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start gap-6"
        sectionClassName="pb-6 md:pb-8"
      />

      <main className="pt-[25px] pb-16">
        <div className="container mx-auto px-4">
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-5 md:p-6 mb-8 shadow-[0_0_40px_-12px_hsl(var(--primary)/0.45)]"
            >
              <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-1">Members only downloads</p>
                    <h2 className="text-lg md:text-xl font-heading font-bold text-foreground leading-snug">
                      Join DATAEEL® to purchase credits and download racecards
                    </h2>
                    <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                      Create a free account, buy credits, and unlock full PDF racecards for the tracks listed below—each
                      download uses one credit during the active window for that race day.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-2 shrink-0 lg:items-end">
                  <Button asChild className="bg-primary text-primary-foreground hover:brightness-110 shadow-neon font-semibold gap-2">
                    <Link to={RACE_JOIN_REDIRECT}>
                      Join now
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-border">
                    <Link to={RACE_AUTH_REDIRECT}>Sign in</Link>
                  </Button>
                  <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary">
                    <Link to="/pricing">View pricing</Link>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
            <div className="flex bg-card rounded-lg border border-border p-1">
              {dayTabs.map((day, idx) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDateIndex(idx)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                    selectedDateIndex === idx
                      ? "bg-primary text-primary-foreground shadow-neon"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-card border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {loading && (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading racecards…</p>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((card, i) => {
                const owned = isOwned(card.id);
                const isDownloading = downloading === card.id;
                const expanded = expandedCardIds.has(card.id);
                const meta = parseRacecardMetadata(card.metadata);
                const metaLine = metadataListingLine(meta);
                const raceRows = buildRaceRows(meta, card.num_races);
                const dlBlock = getRacecardDownloadUiBlock(
                  card.race_date,
                  RACECARD_DOWNLOAD_TZ,
                  Date.now(),
                );
                const downloadDisabled = dlBlock.blocked;
                const canonicalTrackCode = extractCanonicalTrackCode(card.track_code);
                const trackProfile = profileByCode[canonicalTrackCode] ?? null;
                const location = getRacetrackLocation(card.track_code);
                const trackWebsite = trackProfile?.official_url ?? getRacetrackWebsite(card.track_code);

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-dark group relative overflow-hidden rounded-xl"
                  >
                    <TrackCardHeroImage trackCode={card.track_code} />
                    {owned && (
                      <div className="absolute top-4 right-4 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-bold text-green-500 uppercase">Owned</span>
                        </span>
                      </div>
                    )}

                    <div className="mt-4 flex items-start gap-3 mb-6">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="font-mono-data font-bold text-foreground text-sm">
                          {extractCanonicalTrackCode(card.track_code)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-foreground text-sm">
                          {trackProfile?.display_name ?? getRacetrackLabel(card.track_code)}
                        </h3>
                        {location && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0 text-muted-foreground/80" aria-hidden />
                            <span>
                              {location.city}, {location.state}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {card.num_races != null && card.num_races > 0 && <span>{card.num_races} races</span>}
                        </div>
                        {metaLine && (
                          <div className="flex items-start gap-1 mt-1.5 text-[11px] text-muted-foreground">
                            <Cloud className="h-3 w-3 shrink-0 mt-0.5" />
                            <span>{metaLine}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mb-4">
                      <TrackWeatherBadge trackCode={card.track_code} profile={trackProfile} compact />
                    </div>

                    <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 text-xs text-foreground/60">
                      Includes: <span className="text-primary font-medium">Concert™</span> +{" "}
                      <span className="text-info font-medium">Aptitude™</span>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="h-9 justify-between border-border text-xs"
                          onClick={() => toggleExpandedCard(card.id)}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {expanded ? "Hide races" : "View races"}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                        </Button>
                        {trackWebsite && (
                          <Button
                            asChild
                            variant="outline"
                            className="h-9 justify-center border-border text-xs"
                          >
                            <a href={trackWebsite} target="_blank" rel="noopener noreferrer">
                              Track website
                              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                            </a>
                          </Button>
                        )}
                      </div>

                      {expanded && (
                        <div className="rounded-lg border border-border bg-background/35 p-3">
                          {raceRows.length > 0 ? (
                            <div className="space-y-2">
                              {raceRows.map((race) => (
                                <div
                                  key={race.number}
                                  className="flex items-center justify-between gap-3 rounded-md bg-muted/35 px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <div className="font-semibold text-foreground">Race {race.number}</div>
                                    <div className="truncate text-muted-foreground">
                                      {[race.post_time_display, race.type, race.distance].filter(Boolean).join(" · ") || "Details posted with the RaceCard"}
                                    </div>
                                  </div>
                                  {trackWebsite && (
                                    <a
                                      href={trackWebsite}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="shrink-0 text-primary hover:text-neon"
                                      aria-label={`Open official track website for race ${race.number}`}
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Race details are not posted yet. Check the official track website for the latest schedule.
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {!user ? (
                        <Button
                          asChild
                          className="flex-1 bg-primary text-primary-foreground hover:brightness-110 font-semibold text-sm h-10 shadow-neon"
                        >
                          <Link to={RACE_JOIN_REDIRECT}>
                            <CreditCard className="mr-1.5 h-4 w-4" />
                            Join to purchase &amp; download
                          </Link>
                        </Button>
                      ) : (
                        <>
                          {owned && (
                            <Button
                              asChild
                              variant="outline"
                              className="flex-1 border-primary/60 text-primary hover:bg-primary/10 font-semibold text-sm h-10"
                            >
                              <Link to={`/racecards/${card.id}`}>
                                <Eye className="mr-1.5 h-4 w-4" />
                                View digital card
                              </Link>
                            </Button>
                          )}
                          <Button
                            className="flex-1 bg-primary text-primary-foreground hover:brightness-110 font-semibold text-sm h-10 shadow-neon"
                            onClick={() => void handleDownload(card.id)}
                            disabled={isDownloading || downloadDisabled}
                            title={
                              downloadDisabled
                                ? "Downloads closed after the race day in the configured timezone."
                                : undefined
                            }
                          >
                            {isDownloading ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="mr-1.5 h-4 w-4" />
                            )}
                            {owned ? "Re-download" : "Download · 1 Credit"}
                          </Button>
                          {downloadDisabled && (
                            <p className="text-[11px] text-muted-foreground leading-snug px-0.5">
                              {dlBlock.reason === "past_race_day"
                                ? "This race day has passed; downloads are no longer available."
                                : "Download window closed (end of race day)."}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <Search className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No racecards found</h3>
              <p className="text-sm text-muted-foreground">
                No racecards available for this date. Check back later.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RaceCardsBrowse;
