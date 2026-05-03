import { motion } from "framer-motion";
import { ArrowRight, Play, MapPin, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-racing.jpg";

const breakingNews = [
  "Concert algorithm picks Winner in race#1, race#2, race#3, race#6, race#7; Belmont At Big A May1, 2026",
  "Concert algorithm picks Winner in race#1, race#2, race#3, race#6, race#7; Belmont At Big A May1, 2026",
  "Concert algorithm hits PICK 3 in race#3; Belmont At Big A May1, 2026",
  "Concert algorithm hits DAILY DOUBLE in race#2 and in race#3 and in race#7; Belmont At Big A May1, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#4, race#6; Parx Racing May1, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#4, race#6; Parx Racing May1, 2026",
  "Aptitude algorithm hits TRIFECTA in race#8; Laurel Park May1, 2026",
  "Aptitude algorithm hits EXACTA in race#4 and in race#8; Laurel Park May1, 2026",
  "Concert algorithm hits PICK 3 in race#8; Belterra Park May1, 2026",
  "Concert algorithm hits TRIFECTA in race#4; Santa Anita Apr30, 2026",
  "Concert algorithm hits TRIFECTA in race#7; Belmont At Big A Apr30, 2026",
  "Concert algorithm hits TRIFECTA in race#6; Tampa Bay Downs Apr29, 2026",
  "Concert algorithm hits SUPERFECTA in race#6; Tampa Bay Downs Apr29, 2026",
  "Aptitude algorithm hits TRIFECTA in race#3; Mountaineer Park Apr27, 2026",
  "Aptitude algorithm picks Winner in race#3, race#5, race#6, race#7, race#8; Tampa Bay Downs Apr26, 2026",
  "Aptitude algorithm picks Winner in race#3, race#5, race#6, race#7, race#8; Tampa Bay Downs Apr26, 2026",
  "Aptitude algorithm hits PICK 3 in race#7 and in race#8; Tampa Bay Downs Apr26, 2026",
  "Aptitude algorithm hits DAILY DOUBLE in race#6 and in race#7 and in race#8; Tampa Bay Downs Apr26, 2026",
  "Concert algorithm hits PICK 3 in race#5; Oaklawn Park Apr26, 2026",
  "Concert algorithm hits EXACTA in race#1 and in race#2; Camarero Race Track Apr26, 2026",
  "Aptitude algorithm hits EXACTA in race#6 and in race#7; Camarero Race Track Apr26, 2026",
  "Concert algorithm picks Winner in race#3, race#4, race#6, race#10; Gulfstream Park Apr25, 2026",
  "Concert algorithm picks Winner in race#3, race#4, race#6, race#10; Gulfstream Park Apr25, 2026",
  "Concert algorithm hits EXACTA in race#3 and in race#4; Gulfstream Park Apr25, 2026",
  "Aptitude algorithm picks Winner in race#3, race#4, race#8, race#11; Gulfstream Park Apr25, 2026",
  "Aptitude algorithm picks Winner in race#3, race#4, race#8, race#11; Gulfstream Park Apr25, 2026",
  "Concert algorithm hits TRIFECTA in race#7; Laurel Park Apr25, 2026",
  "Concert algorithm hits SUPERFECTA in race#7; Laurel Park Apr25, 2026",
  "Aptitude algorithm hits TRIFECTA in race#2; Churchill Downs Apr25, 2026",
  "Aptitude algorithm hits TRIFECTA in race#2; Tampa Bay Downs Apr25, 2026",
  "Concert algorithm hits PICK 3 in race#8; Santa Anita Apr25, 2026",
  "Concert algorithm picks Winner in race#1, race#3, race#4, race#7; Keeneland Apr24, 2026",
  "Concert algorithm picks Winner in race#1, race#3, race#4, race#7; Keeneland Apr24, 2026",
  "Concert algorithm hits TRIFECTA in race#1; Santa Anita Apr24, 2026",
  "Concert algorithm hits QUINELLA in race#5 and in race#6; Camarero Race Track Apr24, 2026",
  "Concert algorithm hits EXACTA in race#5 and in race#6; Camarero Race Track Apr24, 2026",
  "Concert algorithm hits TRIFECTA in race#6; Camarero Race Track Apr24, 2026",
  "Concert algorithm hits EXACTA in race#2 and in race#9; Charles Town Apr24, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#5, race#6; Oaklawn Park Apr23, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#5, race#6; Oaklawn Park Apr23, 2026",
  "Concert algorithm picks Winner in race#1, race#2, race#5, race#6; Charles Town Apr23, 2026",
  "Concert algorithm picks Winner in race#1, race#2, race#5, race#6; Charles Town Apr23, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#4, race#6; Charles Town Apr23, 2026",
  "Aptitude algorithm picks Winner in race#1, race#2, race#4, race#6; Charles Town Apr23, 2026",
  "Concert algorithm hits EXACTA in race#1 and in race#6; Charles Town Apr23, 2026",
  "Aptitude algorithm hits TRIFECTA in race#5; Hawthorne Apr23, 2026",
];

const trustBadges = [
  { icon: Sparkles, label: "Concert™ & Aptitude™" },
  { icon: MapPin, label: "28+ Racetracks" },
  { icon: InfinityIcon, label: "Credits never expire" },
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
      <div className="absolute top-[var(--header-height)] left-0 right-0 z-20 bg-card/90 backdrop-blur-sm border-b border-border overflow-hidden">
        <div className="flex items-center">
          <div className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
            Breaking News
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="flex w-max min-w-full whitespace-nowrap animate-ticker-scroll will-change-transform motion-reduce:animate-none">
              {[...breakingNews, ...breakingNews].map((news, i) => (
                <span key={i} className="inline-flex items-center text-sm text-foreground/80 mx-8 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mr-3 flex-shrink-0" />
                  {news}
                </span>
              ))}
            </div>
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

          {/* Scroll Indicator */}
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mt-12 sm:mt-14 md:mt-16 flex flex-col items-center gap-2 text-foreground/40"
          >
            <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-foreground/20 flex items-start justify-center p-1.5"
            >
              <div className="w-1.5 h-3 bg-foreground/40 rounded-full" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
