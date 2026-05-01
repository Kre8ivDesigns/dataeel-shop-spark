import { motion } from "framer-motion";
import { ArrowRight, Play, TrendingUp, MapPin, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-racing.jpg";

/** Ticker copy is non-outcome marketing only — specific win/exotic claims require auditable published picks. */
const breakingNews = [
  "EEL RaceCards ship Concert™ and Aptitude™ overlays on every PDF — structured handicapping education, not picks advice.",
  "Browse tracks by date; one credit typically unlocks a full published race day where cards are available.",
  "Coverage marketed for 28+ North American venues — see the RaceCards catalog for what is live on your date.",
  "Outputs are informational; racing has variance — always follow local laws and operator rules.",
];

const trustBadges = [
  { icon: TrendingUp, label: "65-75% Win Rate" },
  { icon: MapPin, label: "28+ Racetracks" },
  { icon: Award, label: "2,000+ Active Bettors" },
];

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Horse racing action shot"
          className="w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, hsl(232 59% 8% / 0.92) 0%, hsl(214 52% 15% / 0.85) 100%)",
          }}
        />
      </div>

      {/* Breaking News Ticker */}
      <div className="absolute top-[72px] left-0 right-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border overflow-hidden">
        <div className="flex items-center">
          <div className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
            Breaking News
          </div>
          <div className="overflow-hidden flex-1">
            <motion.div
              className="flex whitespace-nowrap"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
            >
              {[...breakingNews, ...breakingNews].map((news, i) => (
                <span key={i} className="inline-flex items-center text-sm text-foreground/80 mx-8">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-3 flex-shrink-0" />
                  {news}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground leading-tight mb-6 font-heading tracking-tight"
          >
            Win More. Bet Smarter.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-lg md:text-xl text-foreground/70 max-w-2xl mx-auto mb-4"
          >
            How about a simplified and honest approach to Horse Racing?
            Algorithm-powered RaceCards for 28+ tracks. Two expert algorithms,
            instant downloads, proven results.
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-base text-muted-foreground italic mb-10"
          >
            Horse Racing Simplified®
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link to="/racecards">
              <Button
                size="lg"
                className="btn-neon text-lg px-10 py-6 h-auto"
              >
                Get Today's Cards
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="btn-ghost-light text-lg px-10 py-6 h-auto"
              onClick={() => {
                document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <Play className="mr-2 h-5 w-5" />
              How It Works
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 md:gap-6"
          >
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 backdrop-blur-sm text-foreground/80 text-sm"
              >
                <badge.icon className="h-4 w-4 text-primary" />
                <span>{badge.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-foreground/40">
            <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-1.5"
            >
              <div className="w-1.5 h-3 bg-foreground/40 rounded-full" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
