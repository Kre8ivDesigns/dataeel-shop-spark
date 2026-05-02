import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Download, MapPin, Clock, Loader2, Cloud, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, addDays } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  metadataListingLine,
  parseRacecardMetadata,
  type RacecardDisplayMetadata,
} from "@/lib/raceMetadata";
import { useRacecardsPublicForDate } from "@/lib/queries/racecardsPublic";
import { getRacetrackLabel, getRacetrackLocation } from "@/lib/racetracks";

export const RaceCards = () => {
  const { user } = useAuth();
  const [dayIndex, setDayIndex] = useState(0);

  const dayTabs = useMemo(() => {
    const today = new Date();
    return [
      { label: "Today", date: format(today, "yyyy-MM-dd") },
      { label: "Tomorrow", date: format(addDays(today, 1), "yyyy-MM-dd") },
      { label: format(addDays(today, 2), "EEE M/d"), date: format(addDays(today, 2), "yyyy-MM-dd") },
    ];
  }, []);

  const selectedDate = dayTabs[dayIndex].date;
  const { data: rows = [], isLoading: loading } = useRacecardsPublicForDate(selectedDate);

  const ctaHref = user ? "/racecards" : `/auth?redirect=${encodeURIComponent("/racecards")}`;

  const resolveStatus = (meta: RacecardDisplayMetadata): "available" | "coming" => {
    if (meta.listing_status === "coming") return "coming";
    return "available";
  };

  return (
    <section id="racecards" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <span className="badge-neon mb-4 inline-block">Today&apos;s RaceCards</span>
          <h2 className="section-title mb-4">
            Get Your <span className="text-neon">EEL RaceCards</span>
          </h2>
          <p className="section-subtitle">
            Tracks with published cards for the date you pick. Schedule and conditions are stored with each card
            (database + files); this section uses a short browser cache to avoid redundant loads.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-wrap items-center justify-center gap-2 mb-12"
        >
          {dayTabs.map((day, idx) => (
            <Button
              key={day.date}
              variant={dayIndex === idx ? "default" : "ghost"}
              className={
                dayIndex === idx
                  ? "flex items-center gap-2 bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }
              onClick={() => setDayIndex(idx)}
            >
              {idx === 0 && <Calendar className="h-4 w-4" />}
              {day.label}
            </Button>
          ))}
        </motion.div>

        {loading && (
          <div className="flex justify-center py-16 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {!loading && rows.length === 0 && (
          <p className="text-center text-muted-foreground py-12 max-w-md mx-auto text-sm">
            No racecards published for {dayTabs[dayIndex].label.toLowerCase()} yet. Check back after cards are uploaded
            or synced.
          </p>
        )}

        {!loading && rows.length > 0 && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {rows.map((track, index) => {
              const meta = parseRacecardMetadata(track.metadata);
              const status = resolveStatus(meta);
              const subline = metadataListingLine(meta);
              const location = getRacetrackLocation(track.track_code);
              return (
                <motion.div
                  key={track.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.05 * index }}
                  className={`card-dark relative overflow-hidden ${status === "coming" ? "opacity-60" : ""}`}
                >
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs font-bold">
                      {track.track_code}
                    </span>
                  </div>

                  <div className="mb-6">
                    <h3 className="font-bold text-lg text-foreground mb-2 font-heading pr-12">
                      {getRacetrackLabel(track.track_code)}
                    </h3>
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {location.city}, {location.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Layers className="h-3.5 w-3.5 shrink-0" />
                        {track.num_races != null ? `${track.num_races} races` : "Races TBD"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {format(new Date(track.race_date + "T12:00:00"), "EEE, MMM d")}
                      </span>
                      {subline && (
                        <span className="flex items-start gap-1 text-xs">
                          <Cloud className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="leading-snug">{subline}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mb-6">
                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">Concert</span>
                    <span className="px-2 py-1 rounded-full bg-warning/10 text-warning text-xs font-medium">
                      Aptitude
                    </span>
                  </div>

                  {status === "available" ? (
                    <Button asChild className="w-full bg-primary text-primary-foreground hover:brightness-110 font-semibold">
                      <Link to={ctaHref}>
                        <Download className="h-4 w-4 mr-2" />
                        Get RaceCard – 1 Credit
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="w-full border-border text-muted-foreground">
                      Coming Soon
                    </Button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="text-center mt-10"
        >
          <Button asChild variant="link" className="text-primary hover:text-primary/80">
            <Link to={ctaHref}>Open full RaceCards catalog →</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
