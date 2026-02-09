import { motion } from "framer-motion";
import { Calendar, Download, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const todayTracks = [
  { name: "Tampa Bay Downs", abbr: "TAM", races: 10, status: "available" },
  { name: "Gulfstream Park", abbr: "GP", races: 12, status: "available" },
  { name: "Santa Anita", abbr: "SA", races: 9, status: "available" },
  { name: "Fair Grounds", abbr: "FG", races: 10, status: "coming" },
];

export const RaceCards = () => {
  return (
    <section id="racecards" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="badge-neon mb-4 inline-block">Today's RaceCards</span>
          <h2 className="section-title mb-4">
            Get Your <span className="text-neon">EEL RaceCards</span>
          </h2>
          <p className="section-subtitle">
            Go on, check out which racetracks are running with EEL RaceCards this week!
            One credit = one full day of picks.
          </p>
        </motion.div>

        {/* Date Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <Button variant="outline" className="flex items-center gap-2 border-primary text-primary">
            <Calendar className="h-4 w-4" />
            Today
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Tomorrow
          </Button>
          <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
            Day After
          </Button>
        </motion.div>

        {/* Track Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {todayTracks.map((track, index) => (
            <motion.div
              key={track.abbr}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className={`card-dark relative overflow-hidden ${
                track.status === "coming" ? "opacity-60" : ""
              }`}
            >
              {/* Track Badge */}
              <div className="absolute top-4 right-4">
                <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                  {track.abbr}
                </span>
              </div>

              {/* Track Info */}
              <div className="mb-6">
                <h3 className="font-bold text-lg text-foreground mb-2 font-heading">{track.name}</h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {track.races} races
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    Today
                  </span>
                </div>
              </div>

              {/* Algorithms */}
              <div className="flex gap-2 mb-6">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Concert
                </span>
                <span className="px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                  Aptitude
                </span>
              </div>

              {/* Action */}
              {track.status === "available" ? (
                <Button className="w-full bg-primary text-primary-foreground hover:brightness-110 font-semibold">
                  <Download className="h-4 w-4 mr-2" />
                  Get RaceCard – 1 Credit
                </Button>
              ) : (
                <Button variant="outline" disabled className="w-full border-border text-muted-foreground">
                  Coming Soon
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        {/* View All Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <Button variant="link" className="text-primary hover:text-primary/80">
            View all 28+ tracks →
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
