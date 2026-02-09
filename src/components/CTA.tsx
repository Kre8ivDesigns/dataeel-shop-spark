import { motion } from "framer-motion";
import { ArrowRight, Shield, Zap, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const CTA = () => {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, hsl(232 59% 8%) 0%, hsl(214 52% 20%) 100%)",
      }}
    >
      {/* Decorative */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-warning/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 font-heading">
            Ready to Make{" "}
            <span className="text-neon">Smarter Bets?</span>
          </h2>
          <p className="text-base text-muted-foreground italic mb-4">
            Horse Racing Simplified®
          </p>
          <p className="text-lg text-foreground/60 mb-10 max-w-2xl mx-auto">
            theDATA<strong className="text-foreground">EEL</strong>™ will change your horse racing life.
            Join thousands of bettors who've ditched the Racing Form and started
            winning with algorithmic predictions. Get your first RaceCard today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link to="/racecards">
              <Button
                size="lg"
                className="btn-neon text-lg px-10 py-6 h-auto"
              >
                Get Today's Cards
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="btn-ghost-light text-lg px-10 py-6 h-auto"
              >
                View Pricing
              </Button>
            </Link>
          </div>

          {/* Trust Indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-6 text-foreground/50 text-sm"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Secure payments
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Instant access
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Credits never expire
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};
