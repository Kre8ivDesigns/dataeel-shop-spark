import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Download,
  Eye,
  MapPin,
  Filter,
  CreditCard,
  Search,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";

const RaceCardsBrowse = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [credits, setCredits] = useState<number | null>(null);
  const [racecards, setRacecards] = useState<any[]>([]);
  const [downloads, setDownloads] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    fetchData();
  }, [user, selectedDateIndex]);

  const fetchData = async () => {
    setLoading(true);
    const selectedDate = dayTabs[selectedDateIndex].date;

    // Fetch racecards for selected date
    const { data: cards } = await supabase
      .from("racecards")
      .select("*")
      .eq("race_date", selectedDate)
      .order("track_name");

    setRacecards(cards || []);

    if (user) {
      // Fetch credit balance
      const { data: bal } = await supabase
        .from("credit_balances")
        .select("credits")
        .eq("user_id", user.id)
        .single();
      setCredits(bal?.credits ?? 0);

      // Fetch user's existing downloads
      const { data: dl } = await supabase
        .from("racecard_downloads")
        .select("racecard_id")
        .eq("user_id", user.id);
      setDownloads(new Set((dl || []).map((d: any) => d.racecard_id)));
    }

    setLoading(false);
  };

  const handleDownload = async (racecardId: string) => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be logged in to download racecards.", variant: "destructive" });
      return;
    }

    setDownloading(racecardId);
    try {
      const { data, error } = await supabase.functions.invoke("download-racecard", {
        body: { racecardId },
      });

      if (error || !data?.signedUrl) {
        const msg = data?.error || "Download failed";
        toast({ title: "Download failed", description: msg, variant: "destructive" });
        return;
      }

      // Update local state
      if (!data.alreadyOwned) {
        setCredits((prev) => (prev !== null ? prev - 1 : prev));
      }
      setDownloads((prev) => new Set(prev).add(racecardId));

      // Trigger download
      window.open(data.signedUrl, "_blank");
      toast({ title: data.alreadyOwned ? "Re-downloading" : "Downloaded!", description: `${data.fileName}` });
    } catch (err) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setDownloading(null);
    }
  };

  const filtered = racecards.filter(
    (card) =>
      card.track_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      card.track_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isOwned = (id: string) => downloads.has(id);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
                Race<span className="text-neon">Cards</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Download algorithm-powered predictions for today's races.
              </p>
            </div>
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span className="text-sm font-mono-data font-bold text-primary">
                    {credits ?? "—"}
                  </span>
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

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
            {/* Day Tabs */}
            <div className="flex bg-card rounded-lg border border-border p-1">
              {dayTabs.map((day, idx) => (
                <button
                  key={day.date}
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

            {/* Search */}
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

          {/* Loading */}
          {loading && (
            <div className="text-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading racecards…</p>
            </div>
          )}

          {/* Cards Grid */}
          {!loading && filtered.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((card, i) => {
                const owned = isOwned(card.id);
                const isDownloading = downloading === card.id;

                return (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="card-dark group relative"
                  >
                    {/* Owned Badge */}
                    {owned && (
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          <span className="text-[10px] font-bold text-green-500 uppercase">Owned</span>
                        </span>
                      </div>
                    )}

                    {/* Track Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <span className="font-mono-data font-bold text-foreground text-sm">{card.track_code}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{card.track_name}</h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          {card.num_races && <span>{card.num_races} races</span>}
                        </div>
                      </div>
                    </div>

                    {/* Algorithm Badge */}
                    <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 text-xs text-foreground/60">
                      Includes: <span className="text-primary font-medium">Concert™</span> +{" "}
                      <span className="text-info font-medium">Aptitude™</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-primary text-primary-foreground hover:brightness-110 font-semibold text-sm h-10 shadow-neon"
                        onClick={() => handleDownload(card.id)}
                        disabled={isDownloading}
                      >
                        {isDownloading ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-1.5 h-4 w-4" />
                        )}
                        {owned ? "Re-download" : "Download · 1 Credit"}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Empty State */}
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
