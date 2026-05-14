import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Layers, MapPin, FileDown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { HERO_GRADIENT, PageHeroAmbientOrbs } from "@/components/PageHero";
import { supabase } from "@/integrations/supabase/client";
import { buildTickerLoopItems, tickerDurationSeconds } from "@/lib/breakingNewsTicker";

const stats = [
  { number: "2", label: "Algorithms", sublabel: "Concert™ & Aptitude™", icon: Layers },
  { number: "28+", label: "Tracks", sublabel: "U.S. & Canada (marketing scope)", icon: MapPin },
  { number: "1", label: "Credit / day", sublabel: "Typical full-card unlock", icon: Sparkles },
  { number: "PDF", label: "Instant", sublabel: "Download after unlock", icon: FileDown },
];

const cardHighlights = [
  {
    track: "Digital card results",
    date: "After races",
    algorithm: "Equibase",
    results: "Each digital RaceCard can be checked against published Equibase Full Charts by track, date, and race number.",
    type: "multiple",
  },
  {
    track: "Card-to-chart matchups",
    date: "Track/date",
    algorithm: "DATAEEL",
    results: "Concert™ and Aptitude™ picks on the digital card can be compared with the official winner once the chart is posted.",
    type: "multiple",
  },
  {
    track: "Browse digital cards",
    date: "Your race day",
    algorithm: "EEL",
    results: "Choose a digital RaceCard for your race day, then review how the algorithms performed when official results are available.",
    type: "winner",
  },
];

const FALLBACK_WINNER_HITS = [
  "Concert algorithm picks Winner in race#1, race#2, race#3, race#6, race#7; Belmont At Big A May1, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#4, race#6; Parx Racing May1, 2026",
  "Aptitude algorithm hits TRIFECTA in race#8; Laurel Park May1, 2026",
  "Aptitude algorithm hits EXACTA in race#4 and in race#8; Laurel Park May1, 2026",
  "Concert algorithm hits PICK 3 in race#8; Belterra Park May1, 2026",
  "Concert algorithm hits TRIFECTA in race#4; Santa Anita Apr30, 2026",
  "Concert algorithm hits SUPERFECTA in race#6; Tampa Bay Downs Apr29, 2026",
  "Concert algorithm hits EXACTA in race#3 and in race#4; Gulfstream Park Apr25, 2026",
  "Aptitude algorithm hits TRIFECTA in race#2; Churchill Downs Apr25, 2026",
  "Concert algorithm picks Winner in race#1, race#3, race#4, race#7; Keeneland Apr24, 2026",
];

export const Results = () => {
  const [winnerHits, setWinnerHits] = useState<string[]>(FALLBACK_WINNER_HITS);
  const [tickerDistance, setTickerDistance] = useState<number | null>(null);
  const tickerGroupRef = useRef<HTMLDivElement | null>(null);
  const tickerLoopItems = useMemo(() => buildTickerLoopItems(winnerHits), [winnerHits]);
  const tickerDuration = useMemo(() => tickerDurationSeconds(tickerLoopItems), [tickerLoopItems]);

  useLayoutEffect(() => {
    const group = tickerGroupRef.current;
    if (!group) return;

    const updateDistance = () => {
      setTickerDistance(Math.ceil(group.scrollWidth));
    };

    updateDistance();
    const observer = new ResizeObserver(updateDistance);
    observer.observe(group);
    if (document.fonts) {
      void document.fonts.ready.then(updateDistance);
    }

    return () => observer.disconnect();
  }, [tickerLoopItems]);

  useEffect(() => {
    supabase
      .from("breaking_news_items")
      .select("text")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const hits = (data ?? [])
          .map((row) => row.text)
          .filter((text) => /\b(?:winner|exacta|trifecta|superfecta|pick\s*3|daily double)\b/i.test(text));
        if (hits.length > 0) setWinnerHits(hits);
      });
  }, []);

  return (
    <section
      id="results"
      className="py-24 relative overflow-hidden"
      style={{ background: HERO_GRADIENT }}
    >
      <PageHeroAmbientOrbs />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge-neon mb-4 inline-block">Proven Results</span>
          <h2 className="section-title mb-4">
            See Our Algorithms{" "}
            <span className="text-neon">In Action</span>
          </h2>
          <p className="section-subtitle">
            Our algorithms provide insight for picking winners and more complex selections across major tracks.
            We are connecting RaceCards to official result charts so you can compare how Concert™ and Aptitude™
            performed after races are final. Results are informational — not guarantees for future races; see our{" "}
            <Link to="/disclaimer" className="text-primary underline underline-offset-2 hover:text-neon">
              Disclaimer
            </Link>
            .
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className="glass-card text-center group hover:border-primary/30 transition-all"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 bg-primary/10">
                <stat.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-3xl md:text-4xl font-bold mb-1 font-mono text-primary">
                {stat.number}
              </div>
              <div className="text-foreground font-medium">{stat.label}</div>
              <div className="text-muted-foreground text-sm">{stat.sublabel}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Winners Scroll */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mb-16 overflow-hidden rounded-2xl border border-primary/25 bg-card/70 shadow-[0_0_32px_hsl(var(--primary)/0.08)] backdrop-blur-sm"
        >
          <div className="flex flex-col border-b border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 font-heading text-lg font-semibold text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent DATAEEL Hits
            </div>
            <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:mt-0">
              Winners • Exactas • Trifectas
            </span>
          </div>
          <div className="overflow-hidden py-4">
            <div
              className="flex w-max whitespace-nowrap animate-ticker-scroll will-change-transform motion-reduce:animate-none"
              style={{
                animationDuration: `${tickerDuration}s`,
                "--ticker-distance": tickerDistance ? `${tickerDistance}px` : "50%",
              } as CSSProperties}
            >
              <div ref={tickerGroupRef} className="flex shrink-0 whitespace-nowrap">
                {tickerLoopItems.map((hit, i) => (
                  <span key={`results-a-${i}`} className="mx-4 inline-flex shrink-0 items-center gap-3 rounded-full border border-primary/20 bg-muted/45 px-4 py-2 text-sm font-medium text-foreground/85">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {hit}
                  </span>
                ))}
              </div>
              <div className="flex shrink-0 whitespace-nowrap" aria-hidden="true">
                {tickerLoopItems.map((hit, i) => (
                  <span key={`results-b-${i}`} className="mx-4 inline-flex shrink-0 items-center gap-3 rounded-full border border-primary/20 bg-muted/45 px-4 py-2 text-sm font-medium text-foreground/85">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {hit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Wins Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2 font-heading">
            <TrendingUp className="h-5 w-5 text-primary" />
            Digital RaceCard Results Check
          </h3>

          <div className="space-y-4">
            {cardHighlights.map((win, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border hover:border-primary/30 transition-all"
              >
                <div
                  className={`w-2 h-12 rounded-full ${
                    win.type === "trifecta"
                      ? "bg-danger"
                      : win.type === "multiple"
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground">{win.track}</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {win.algorithm}™
                    </span>
                  </div>
                  <p className="text-foreground/70 text-sm">{win.results}</p>
                </div>
                <span className="text-muted-foreground text-sm whitespace-nowrap">
                  {win.date}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="mb-4 text-xs text-muted-foreground">
              Official result checks use Equibase Full Charts. Data provided by Equibase Company LLC.
            </p>
            <p className="mb-4 text-sm text-foreground/70">
              Registration is FREE and gives you access to this week's digital EEL RaceCards by racetrack.
            </p>
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted hover:border-primary/30"
              asChild
            >
              <Link to="/racecards">
                Browse Digital RaceCards
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
