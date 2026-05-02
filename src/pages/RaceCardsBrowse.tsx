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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { metadataListingLine, parseRacecardMetadata } from "@/lib/raceMetadata";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRacecardsPublicForDate } from "@/lib/queries/racecardsPublic";
import { racecardDownloadKeys, userDashboardKeys } from "@/lib/queryKeys";
import {
  DEFAULT_RACECARD_DOWNLOAD_TZ,
  getRacecardDownloadUiBlock,
} from "@/lib/racecardDownloadDeadline";
import { getInvokeErrorMessage } from "@/lib/edgeFunctionErrors";

const RACECARD_DOWNLOAD_TZ =
  import.meta.env.VITE_RACECARD_DOWNLOAD_TZ ?? DEFAULT_RACECARD_DOWNLOAD_TZ;

const RaceCardsBrowse = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [downloading, setDownloading] = useState<string | null>(null);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);

  const dayTabs = useMemo(() => {
    const today = new Date();
    return [
      { label: "Today", date: format(today, "yyyy-MM-dd") },
      { label: "Tomorrow", date: format(addDays(today, 1), "yyyy-MM-dd") },
      { label: format(addDays(today, 2), "MMM d"), date: format(addDays(today, 2), "yyyy-MM-dd") },
    ];
  }, []);

  const selectedDate = dayTabs[selectedDateIndex].date;
  const { data: racecards = [], isLoading: cardsLoading } = useRacecardsPublicForDate(selectedDate);

  const { data: credits = null } = useQuery({
    queryKey: ["credit-balance", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("credit_balances")
        .select("credits")
        .eq("user_id", user!.id)
        .single();
      return data?.credits ?? 0;
    },
    enabled: !!user,
  });

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

      window.open(data.signedUrl, "_blank");
      toast({ title: data.alreadyOwned ? "Re-downloading" : "Downloaded!", description: `${data.fileName}` });
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const filtered = racecards.filter(
    (card) =>
      card.track_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.track_code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const isOwned = (id: string) => downloads.has(id);
  const loading = cardsLoading;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
                Race<span className="text-neon">Cards</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Listings are read from the database (with browser caching). PDFs are served from **Amazon S3** via a
                presigned URL when you download.
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono-data font-bold text-primary">{credits ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">credits</span>
                </div>
                <Link to="/buy-credits">
                  <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 text-xs">
                    Buy More
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
            <div className="flex bg-card rounded-lg border border-border p-1">
              {dayTabs.map((day, idx) => (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => setSelectedDateIndex(idx)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    selectedDateIndex === idx
                      ? "bg-primary text-primary-foreground"
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
                const metaLine = metadataListingLine(parseRacecardMetadata(card.metadata));
                const dlBlock = getRacecardDownloadUiBlock(
                  card.race_date,
                  RACECARD_DOWNLOAD_TZ,
                  Date.now(),
                );
                const downloadDisabled = dlBlock.blocked;

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-dark group relative"
                  >
                    {owned && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-bold text-green-500 uppercase">Owned</span>
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="font-mono-data font-bold text-foreground text-sm">{card.track_code}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{card.track_name}</h3>
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

                    <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 text-xs text-foreground/60">
                      Includes: <span className="text-primary font-medium">Concert™</span> +{" "}
                      <span className="text-info font-medium">Aptitude™</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
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
