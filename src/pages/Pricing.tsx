import { motion } from "framer-motion";
import { Check, Zap, Crown, Star, ArrowLeft, Shield, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const creditPackages = [
  {
    name: "Single",
    credits: 1,
    price: 5,
    pricePerCredit: 5,
    description: "Try us out",
    features: [
      "1 RaceCard download",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
    ],
    popular: false,
    cta: "Buy 1 Credit",
  },
  {
    name: "Starter",
    credits: 5,
    price: 20,
    pricePerCredit: 4,
    savings: 5,
    description: "Perfect for casual race days",
    features: [
      "5 RaceCard downloads",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
    ],
    popular: false,
    cta: "Buy 5 Credits",
  },
  {
    name: "Best Value",
    credits: 15,
    price: 50,
    pricePerCredit: 3.33,
    savings: 25,
    description: "Most popular choice",
    features: [
      "15 RaceCard downloads",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
      "Priority support",
    ],
    popular: true,
    cta: "Buy 15 Credits",
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
    cta: "Buy 40 Credits",
  },
  {
    name: "Season Pass",
    credits: 100,
    price: 200,
    pricePerCredit: 2.00,
    savings: 300,
    description: "Ultimate value for regulars",
    features: [
      "100 RaceCard downloads",
      "Any track, any day",
      "Both algorithms included",
      "PDF download format",
      "VIP priority support",
      "Early access to new features",
      "Exclusive betting guides",
    ],
    popular: false,
    cta: "Buy 100 Credits",
  },
];

const benefits = [
  {
    icon: Clock,
    title: "Credits Never Expire",
    description: "Use them whenever you're ready. No rush, no pressure.",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "All transactions are encrypted and processed securely.",
  },
  {
    icon: Shield,
    title: "Satisfaction Guaranteed",
    description: "Not happy? Contact us within 24 hours for support.",
  },
];

const PricingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-16 bg-navy relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-racing-green/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-gold/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-racing-green/20 text-racing-green text-sm font-semibold mb-4">
              Simple Pricing
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              Credit Packages for{" "}
              <span className="text-racing-green">Every Bettor</span>
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Buy credits, use them anytime. One credit = one full day of predictions
              for any track. No subscriptions, no hidden fees.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits Strip */}
      <section className="py-8 bg-muted/50 border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3 text-center md:text-left"
              >
                <div className="w-10 h-10 rounded-full bg-racing-green/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-racing-green" />
                </div>
                <div>
                  <div className="font-semibold text-charcoal text-sm">
                    {benefit.title}
                  </div>
                  <div className="text-xs text-muted-foreground hidden md:block">
                    {benefit.description}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
            {creditPackages.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`relative rounded-3xl p-6 flex flex-col ${
                  plan.popular
                    ? "bg-navy text-white shadow-2xl ring-4 ring-racing-green/50 lg:scale-110 z-10"
                    : "bg-white shadow-lg border border-border"
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
                <div className="text-center mb-4">
                  <h3
                    className={`text-lg font-bold mb-1 ${
                      plan.popular ? "text-white" : "text-charcoal"
                    }`}
                  >
                    {plan.name}
                  </h3>
                  <p
                    className={`text-xs ${
                      plan.popular ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {plan.description}
                  </p>
                </div>

                {/* Price */}
                <div className="text-center mb-4">
                  <div className="flex items-baseline justify-center gap-1">
                    <span
                      className={`text-4xl font-bold ${
                        plan.popular ? "text-white" : "text-charcoal"
                      }`}
                    >
                      ${plan.price}
                    </span>
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      plan.popular ? "text-white/70" : "text-muted-foreground"
                    }`}
                  >
                    {plan.credits} credit{plan.credits > 1 ? "s" : ""} ·{" "}
                    ${plan.pricePerCredit.toFixed(2)}/card
                  </div>
                  {plan.savings && (
                    <div className="mt-2">
                      <span className="text-xs font-semibold text-racing-green">
                        Save ${plan.savings}
                      </span>
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check
                        className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                          plan.popular ? "text-racing-green" : "text-racing-green"
                        }`}
                      />
                      <span
                        className={`text-xs ${
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
                  className={`w-full font-semibold ${
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

          {/* Compare Note */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-16 max-w-2xl mx-auto"
          >
            <div className="p-6 rounded-2xl bg-muted/50 border border-border">
              <h3 className="font-semibold text-charcoal mb-2">
                💡 How does this compare to traditional handicapping?
              </h3>
              <p className="text-sm text-muted-foreground">
                A single day at the track can cost $50+ for Racing Forms, tip sheets,
                and programs. DATAEEL gives you algorithmic predictions for just $5 per
                track—that's 90% less than traditional methods.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-charcoal text-center mb-8">
            Pricing FAQs
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-2">
                What is a credit?
              </h3>
              <p className="text-sm text-muted-foreground">
                One credit = one RaceCard download. A RaceCard contains all race
                predictions for a single track on a single day.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-2">
                Do credits expire?
              </h3>
              <p className="text-sm text-muted-foreground">
                No! Your credits never expire. Buy them when convenient and use them
                whenever you're ready to hit the track.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-muted-foreground">
                We accept all major credit cards, debit cards, and PayPal. All
                transactions are securely processed.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-semibold text-charcoal mb-2">
                Can I get a refund?
              </h3>
              <p className="text-sm text-muted-foreground">
                Unused credits can be refunded within 30 days of purchase. Contact our
                support team for assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
