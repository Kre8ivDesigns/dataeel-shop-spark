import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Download,
  Eye,
  Cloud,
  Sun,
  CloudRain,
  MapPin,
  Filter,
  CreditCard,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const dayTabs = ["Today", "Tomorrow", "Feb 11"];

const raceCards = [
  { track: "Gulfstream Park", code: "GP", races: 11, postTime: "12:15 PM", weather: "sunny", live: true, region: "East" },
  { track: "Santa Anita", code: "SA", races: 9, postTime: "3:00 PM", weather: "sunny", live: false, region: "West" },
  { track: "Aqueduct", code: "AQU", races: 8, postTime: "12:50 PM", weather: "cloudy", live: true, region: "East" },
  { track: "Tampa Bay Downs", code: "TAM", races: 10, postTime: "12:25 PM", weather: "sunny", live: true, region: "East" },
  { track: "Fair Grounds", code: "FG", races: 9, postTime: "1:00 PM", weather: "rainy", live: false, region: "East" },
  { track: "Oaklawn Park", code: "OP", races: 9, postTime: "1:30 PM", weather: "cloudy", live: false, region: "Midwest" },
  { track: "Woodbine", code: "WO", races: 8, postTime: "1:10 PM", weather: "cloudy", live: false, region: "Canada" },
  { track: "Del Mar", code: "DMR", races: 8, postTime: "4:00 PM", weather: "sunny", live: false, region: "West" },
  { track: "Keeneland", code: "KEE", races: 10, postTime: "1:05 PM", weather: "sunny", live: false, region: "Midwest" },
];

const WeatherIcon = ({ weather }: { weather: string }) => {
  switch (weather) {
    case "sunny": return <Sun className="h-4 w-4 text-warning" />;
    case "rainy": return <CloudRain className="h-4 w-4 text-info" />;
    default: return <Cloud className="h-4 w-4 text-muted-foreground" />;
  }
};

const RaceCardsBrowse = () => {
  const [activeDay, setActiveDay] = useState("Today");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = raceCards.filter((card) =>
    card.track.toLowerCase().includes(searchQuery.toLowerCase()) ||
    card.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border">
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-sm font-mono-data font-bold text-primary">12</span>
                <span className="text-xs text-muted-foreground">credits</span>
              </div>
              <Link to="/buy-credits">
                <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary/10 text-xs">
                  Buy More
                </Button>
              </Link>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-8">
            {/* Day Tabs */}
            <div className="flex bg-card rounded-lg border border-border p-1">
              {dayTabs.map((day) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeDay === day
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {day}
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

            <Button variant="outline" size="sm" className="border-border text-foreground/60 hover:text-foreground gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Cards Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((card, i) => (
              <motion.div
                key={card.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card-dark group relative"
              >
                {/* Live Badge */}
                {card.live && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                      </span>
                      <span className="text-[10px] font-bold text-primary uppercase">Live</span>
                    </span>
                  </div>
                )}

                {/* Track Header */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="font-mono-data font-bold text-foreground text-sm">{card.code}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{card.track}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{card.races} races</span>
                      <span>·</span>
                      <WeatherIcon weather={card.weather} />
                      <span className="capitalize">{card.weather}</span>
                    </div>
                  </div>
                </div>

                {/* Info Row */}
                <div className="flex items-center justify-between mb-4 text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {card.region}
                  </div>
                  <span className="text-foreground/60">First post: {card.postTime}</span>
                </div>

                {/* Algorithm Badge */}
                <div className="mb-4 px-3 py-2 rounded-lg bg-muted/50 text-xs text-foreground/60">
                  Includes: <span className="text-primary font-medium">Concert™</span> +{" "}
                  <span className="text-info font-medium">Aptitude™</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button className="flex-1 bg-primary text-primary-foreground hover:brightness-110 font-semibold text-sm h-10 shadow-neon">
                    <Download className="mr-1.5 h-4 w-4" />
                    Download · 1 Credit
                  </Button>
                  <Button variant="outline" size="icon" className="border-border text-foreground/60 hover:text-foreground h-10 w-10">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="text-center py-20">
              <Search className="h-12 w-12 text-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No tracks found</h3>
              <p className="text-sm text-muted-foreground">Try a different search term or check back later.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default RaceCardsBrowse;
