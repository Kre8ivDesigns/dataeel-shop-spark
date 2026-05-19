import { motion } from "framer-motion";
import { ArrowRight, FileText, MapPin, Sparkles, Infinity as InfinityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-racing.jpg";

const trustBadges = [
  { icon: Sparkles, label: "Concert™ & Aptitude™" },
  { icon: MapPin, label: "28+ Racetracks" },
  { icon: InfinityIcon, label: "Credits never expire" },
];

export const Hero = () => {
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
            simple PDF file. Just spend your time planning your betting strategy.
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
