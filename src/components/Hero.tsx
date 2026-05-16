import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, MapPin, Sparkles, Infinity as InfinityIcon, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-racing.jpg";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_NEWS = [
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

function countHitType(items: string[], pattern: RegExp): number {
  return items.filter((item) => pattern.test(item)).length;
}

export const Hero = () => {
  const [resultItems, setResultItems] = useState<string[]>(FALLBACK_NEWS);
  const resultSummary = useMemo(
    () => [
      { label: "Recent hit notes", value: resultItems.length },
      { label: "Winner calls", value: countHitType(resultItems, /\bwinner\b/i) },
      { label: "Exotics posted", value: countHitType(resultItems, /\b(?:exacta|trifecta|superfecta|pick\s*3|daily double)\b/i) },
    ],
    [resultItems],
  );

  useEffect(() => {
    supabase
      .from("breaking_news_items")
      .select("text")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setResultItems(data.map((r) => r.text));
        }
      });
  }, []);

  return (
    <section className="relative mt-[calc(var(--header-height)+2rem)] flex min-h-[calc(100svh-var(--header-height)-2rem)] items-center justify-center overflow-hidden sm:mt-[calc(var(--header-height)+2.25rem)] sm:min-h-[calc(100svh-var(--header-height)-2.25rem)]">
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

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pb-10 pt-[75px] sm:pb-14 lg:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-4 inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-card/70 px-3 py-2 text-xs text-foreground/80 shadow-[0_0_28px_hsl(var(--primary)/0.12)] backdrop-blur-sm sm:mb-6 sm:gap-2 sm:px-4 sm:text-sm"
          >
            <Trophy className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Recent results snapshot:</span>
            <span>{resultSummary[1].value} winner calls</span>
            <span aria-hidden="true" className="text-muted-foreground">/</span>
            <span>{resultSummary[2].value} exotics posted</span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-3xl font-bold leading-tight text-foreground sm:text-4xl md:mb-6 md:text-5xl lg:text-6xl xl:text-7xl font-heading tracking-tight"
          >
            Stop Guessing. Start Reading the Race Smarter.
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-3 max-w-2xl text-base text-foreground/70 sm:text-lg md:mb-4 md:text-xl"
          >
            Algorithm-powered RaceCards for 28+ tracks. See the Concert™ and Aptitude™ picks in a
            simple PDF before you spend hours buried in past performances.
          </motion.p>

          {/* Tagline */}
          <motion.p
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 text-sm italic text-muted-foreground sm:mb-8 sm:text-base"
          >
            Horse Racing Simplified®
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 flex flex-col items-stretch justify-center gap-3 sm:mb-8 sm:flex-row sm:items-center sm:gap-4"
          >
            <Link to="/how-to-read-racecard">
              <Button
                size="lg"
                className="btn-neon h-auto w-full px-8 py-5 text-base sm:w-auto sm:px-10 sm:py-6 sm:text-lg"
              >
                <FileText className="mr-2 h-5 w-5" />
                View Sample RaceCard
              </Button>
            </Link>
            <Link to="/racecards">
              <Button
                size="lg"
                variant="outline"
                className="btn-ghost-light h-auto w-full px-8 py-5 text-base sm:w-auto sm:px-10 sm:py-6 sm:text-lg"
              >
                Today Races
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 md:gap-6"
          >
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs text-foreground/80 backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
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
            className="mt-8 hidden flex-col items-center gap-2 text-foreground/40 sm:flex"
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
