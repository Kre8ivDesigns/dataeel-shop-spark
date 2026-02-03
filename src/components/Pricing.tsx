import { motion } from "framer-motion";
import { Check, Zap, Crown, Star, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const pricingPlans = [
  {
    name: "Starter",
    credits: 5,
    price: 20,
    pricePerCredit: 4,
    description: "Perfect for casual race days",
    features: [
      "5 RaceCard downloads",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
    ],
    popular: false,
    cta: "Get Started",
  },
  {
    name: "Best Value",
    credits: 15,
    price: 50,
    pricePerCredit: 3.33,
    savings: 25,
    description: "Most popular choice for regular bettors",
    features: [
      "15 RaceCard downloads",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
      "Priority support",
    ],
    popular: true,
    cta: "Get Best Value",
  },
  {
    name: "Pro",
    credits: 40,
    price: 100,
    pricePerCredit: 2.50,
    savings: 100,
    description: "For serious handicappers",
    features: [
      "40 RaceCard downloads",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
      "Priority support",
      "Early access to new features",
    ],
    popular: false,
    cta: "Go Pro",
  },
];

export const Pricing = () => {
  return (
    <section id="pricing" className="py-24 bg-muted/30 relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-racing-green/10 text-racing-green text-sm font-semibold mb-4">
            Simple Pricing
          </span>
          <h2 className="section-title mb-4">
            Credit Packages for{" "}
            <span className="text-racing-green">Every Bettor</span>
          </h2>
          <p className="section-subtitle">
            Buy credits, use them anytime. One credit = one full day of predictions for any track.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className={`relative rounded-3xl p-8 ${
                plan.popular
                  ? "bg-navy text-white shadow-2xl scale-105 z-10"
                  : "bg-white shadow-lg"
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="badge-gold flex items-center gap-1.5">
                    <Crown className="h-4 w-4" />
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="text-center mb-6">
                <h3
                  className={`text-xl font-bold mb-2 ${
                    plan.popular ? "text-white" : "text-charcoal"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm ${
                    plan.popular ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-baseline justify-center gap-1">
                  <span
                    className={`text-5xl font-bold ${
                      plan.popular ? "text-white" : "text-charcoal"
                    }`}
                  >
                    ${plan.price}
                  </span>
                </div>
                <div
                  className={`text-sm mt-2 ${
                    plan.popular ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  {plan.credits} credits · ${plan.pricePerCredit.toFixed(2)} per RaceCard
                </div>
                {plan.savings && (
                  <div className="mt-2">
                    <span
                      className={`text-sm font-semibold ${
                        plan.popular ? "text-racing-green" : "text-racing-green"
                      }`}
                    >
                      Save ${plan.savings}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Check
                      className={`h-5 w-5 flex-shrink-0 ${
                        plan.popular ? "text-racing-green" : "text-racing-green"
                      }`}
                    />
                    <span
                      className={`text-sm ${
                        plan.popular ? "text-white/90" : "text-charcoal"
                      }`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Button
                className={`w-full py-6 font-semibold text-base ${
                  plan.popular
                    ? "bg-racing-green hover:bg-racing-green-dark text-white shadow-green"
                    : "bg-navy hover:bg-navy-light text-white"
                }`}
              >
                {plan.cta}
                {plan.popular && <Zap className="ml-2 h-4 w-4" />}
              </Button>
            </motion.div>
          ))}
        </div>

        {/* Bottom Note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Credits never expire. Use them whenever you're ready to hit the track.
          </p>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 mt-4 text-racing-green font-medium hover:underline"
          >
            View full pricing details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
