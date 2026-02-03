import { motion } from "framer-motion";
import { ArrowRight, Play, TrendingUp, MapPin, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-racing.jpg";

const trustBadges = [
  { icon: MapPin, label: "30+ Racetracks" },
  { icon: Award, label: "97+ Years Experience" },
  { icon: TrendingUp, label: "Powered by Equibase® Data" },
];

export const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Horse racing at golden hour"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/80 via-navy/70 to-navy/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-navy/60 via-transparent to-navy/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Breaking News Ticker */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-warm-red/20 border border-warm-red/30"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warm-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warm-red"></span>
            </span>
            <span className="text-sm font-medium text-white">
              <span className="text-warm-red font-bold">BREAKING:</span> Concert algorithm picks 4 Winners at Tampa Bay Downs
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-6"
          >
            Thoroughbred Predictions
            <br />
            <span className="text-gradient">Powered by Algorithms</span>
            <br />
            <span className="text-white/90">Not Guesswork</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="tagline text-2xl md:text-3xl text-gold mb-4"
          >
            Horse Racing Simplified®
          </motion.p>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10"
          >
            Get a full day of race picks for just $5. No software. No complexity. Just results.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Button
              size="lg"
              className="btn-hero-primary text-lg px-10 py-6"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="btn-hero-secondary text-lg px-10 py-6"
            >
              <Play className="mr-2 h-5 w-5" />
              See How It Works
            </Button>
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-4 md:gap-6"
          >
            {trustBadges.map((badge, index) => (
              <div
                key={badge.label}
                className="trust-badge"
              >
                <badge.icon className="h-4 w-4 text-racing-green" />
                <span>{badge.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5"
            >
              <div className="w-1.5 h-3 bg-white/60 rounded-full" />
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
