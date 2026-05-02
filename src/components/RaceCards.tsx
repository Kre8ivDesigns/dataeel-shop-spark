import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Download, MapPin, Clock, Loader2, Cloud, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, addDays, isValid } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import {
  metadataListingLine,
  parseRacecardMetadata,
  type RacecardDisplayMetadata,
} from "@/lib/raceMetadata";
import { useRacecardsPublicForDate } from "@/lib/queries/racecardsPublic";
import { extractCanonicalTrackCode, getRacetrackLabel, getRacetrackLocation } from "@/lib/racetracks";

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
  const previewRows = rows.slice(0, 4);

  const ctaHref = user ? "/racecards" : `/auth?redirect=${encodeURIComponent("/racecards")}`;

  const resolveStatus = (meta: RacecardDisplayMetadata): "available" | "coming" => {
    if (meta.listing_status === "coming") return "coming";
    return "available";
  };

  return (
    <section id="racecards" className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6">
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
            Pick a date to see which tracks have RaceCards available. Published cards for that day appear here as soon
            as they are ready.
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {previewRows.map((track, index) => {
              const meta = parseRacecardMetadata(track.metadata);
              const status = resolveStatus(meta);
              const subline = metadataListingLine(meta);
              const location = getRacetrackLocation(track.track_code);
              const raceDay = new Date(`${track.race_date}T12:00:00`);
              const raceDayLabel = isValid(raceDay)
                ? format(raceDay, "EEE, MMM d")
                : track.race_date ?? "—";
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
                      {extractCanonicalTrackCode(track.track_code)}
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
                        {raceDayLabel}
                      </span>
                      {subline && (
                        <span className="flex items-start gap-1 text-xs">
                          <Cloud className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <span className="leading-snug">{subline}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      Concert
                    </span>
                    <span className="px-3 py-1.5 rounded-full bg-warning/10 text-warning text-xs font-medium">
                      Aptitude
                    </span>
                  </div>

                  {status === "available" ? (
                    <Button
                      asChild
                      className="w-full h-auto min-h-11 bg-primary px-4 py-3.5 text-primary-foreground shadow-neon hover:brightness-110 font-semibold whitespace-normal text-center leading-snug"
                    >
                      <Link
                        to={ctaHref}
                        className="inline-flex w-full min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1"
                      >
                        <Download className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="min-w-0">Get RaceCard – 1 Credit</span>
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled
                      className="w-full h-auto min-h-11 border-border px-4 py-3.5 text-muted-foreground"
                    >
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
          <Button asChild className="bg-primary text-primary-foreground hover:brightness-110 shadow-neon">
            <Link to="/racecards">Browse All RaceCards</Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
