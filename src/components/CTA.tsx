import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const CTA = () => {
  return (
    <section className="py-24 bg-navy relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-racing-green/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Simplify Your{" "}
            <span className="text-racing-green">Horse Racing?</span>
          </h2>
          <p className="tagline text-2xl text-gold mb-8">
            Horse Racing Simplified®
          </p>
          <p className="text-lg text-white/70 mb-10 max-w-2xl mx-auto">
            Join thousands of bettors who've ditched the Racing Form and started
            winning with algorithmic predictions. Get your first RaceCard today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="btn-hero-primary text-lg px-10 py-6"
            >
              Get Started for $5
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <div className="text-white/60 text-sm">
              No subscription required. Buy credits as you need them.
            </div>
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-6 text-white/50 text-sm"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-racing-green" />
              Secure payments
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-racing-green" />
              Instant access
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-racing-green" />
              Credits never expire
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
