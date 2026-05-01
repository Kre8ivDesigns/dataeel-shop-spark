import { motion } from "framer-motion";
import { TrendingUp, Layers, MapPin, FileDown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const stats = [
  { number: "2", label: "Algorithms", sublabel: "Concert™ & Aptitude™", icon: Layers },
  { number: "28+", label: "Tracks", sublabel: "U.S. & Canada (marketing scope)", icon: MapPin },
  { number: "1", label: "Credit / day", sublabel: "Typical full-card unlock", icon: Sparkles },
  { number: "PDF", label: "Instant", sublabel: "Download after unlock", icon: FileDown },
];

const cardHighlights = [
  {
    track: "Every card",
    date: "—",
    algorithm: "Concert",
    results: "Live-performance emphasis — trips, energy, finishing patterns under race-day pressure.",
    type: "multiple",
  },
  {
    track: "Every card",
    date: "—",
    algorithm: "Aptitude",
    results: "Ability & suitability — class, distance/surface fit, pace matchup, stamina context.",
    type: "multiple",
  },
  {
    track: "Browse",
    date: "Your date",
    algorithm: "EEL",
    results: "Pick a track and calendar day in RaceCards; availability follows the live racing schedule.",
    type: "winner",
  },
];

export const Results = () => {
  return (
    <section id="results" className="py-24 bg-card relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 border border-primary rounded-full" />
        <div className="absolute bottom-20 right-20 w-48 h-48 border border-warning rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge-neon mb-4 inline-block">What you get</span>
          <h2 className="section-title mb-4">
            Two Algorithms{" "}
            <span className="text-neon">On Every Card</span>
          </h2>
          <p className="section-subtitle">
            Each EEL RaceCard PDF combines Concert™ and Aptitude™ views on structured race data for
            handicapping education. Past marketing anecdotes are illustrations only — not guarantees for
            future races.
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
            Card highlights
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
            <Button
              variant="outline"
              className="border-border text-foreground hover:bg-muted hover:border-primary/30"
              asChild
            >
              <Link to="/racecards">
                Browse RaceCards
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
