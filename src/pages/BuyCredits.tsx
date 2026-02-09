import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  Check,
  Zap,
  Crown,
  ArrowLeft,
  Shield,
  CreditCard,
  Clock,
  ShoppingCart,
  ChevronRight,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const creditPackages = [
  {
    id: "single",
    name: "Single",
    credits: 1,
    price: 5,
    pricePerCredit: 5,
    description: "Try us out",
    features: ["1 RaceCard download", "Any track, any day", "Both algorithms"],
    popular: false,
  },
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    price: 20,
    pricePerCredit: 4,
    savings: 5,
    description: "Perfect for casual race days",
    features: ["5 RaceCard downloads", "Any track, any day", "Both algorithms"],
    popular: false,
  },
  {
    id: "best-value",
    name: "Best Value",
    credits: 15,
    price: 50,
    pricePerCredit: 3.33,
    savings: 25,
    description: "Most popular choice",
    features: ["15 RaceCard downloads", "Any track, any day", "Both algorithms", "Priority support"],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 40,
    price: 100,
    pricePerCredit: 2.5,
    savings: 100,
    description: "For serious handicappers",
    features: ["40 RaceCard downloads", "Any track, any day", "Both algorithms", "Priority support", "Early access"],
    popular: false,
  },
  {
    id: "season",
    name: "Season Pass",
    credits: 100,
    price: 200,
    pricePerCredit: 2.0,
    savings: 300,
    description: "Ultimate value for regulars",
    features: ["100 RaceCard downloads", "Any track, any day", "Both algorithms", "VIP support", "Early access", "Betting guides"],
    popular: false,
  },
];

const BuyCredits = () => {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const currentCredits = 12;

  const selected = creditPackages.find((p) => p.id === selectedPackage);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-foreground font-heading tracking-tight">
              Buy <span className="text-neon">Credits</span>
            </h1>
            <p className="text-muted-foreground mt-1">
              Current balance: <span className="text-primary font-mono-data font-bold">{currentCredits} credits</span>
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Package Selection */}
            <div className="lg:col-span-2">
              <h2 className="text-lg font-semibold text-foreground mb-4 font-heading">
                Select a Package
              </h2>
              <div className="space-y-3">
                {creditPackages.map((pkg, i) => (
                  <motion.button
                    key={pkg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedPackage(pkg.id)}
                    className={`w-full text-left rounded-xl p-5 transition-all duration-200 border ${
                      selectedPackage === pkg.id
                        ? "border-primary bg-primary/5 shadow-neon"
                        : "border-border bg-card hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Radio indicator */}
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          selectedPackage === pkg.id ? "border-primary" : "border-foreground/30"
                        }`}>
                          {selectedPackage === pkg.id && (
                            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{pkg.name}</span>
                            {pkg.popular && (
                              <span className="badge-neon text-[10px] px-2 py-0.5">
                                <Crown className="h-3 w-3 mr-1 inline" />
                                Popular
                              </span>
                            )}
                            {pkg.savings && (
                              <span className="text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                Save ${pkg.savings}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {pkg.credits} credit{pkg.credits > 1 ? "s" : ""} · ${pkg.pricePerCredit.toFixed(2)}/card · {pkg.description}
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-foreground font-mono-data">${pkg.price}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Benefits */}
              <div className="grid sm:grid-cols-3 gap-4 mt-8">
                {[
                  { icon: Clock, title: "Never Expire", desc: "Use anytime" },
                  { icon: Shield, title: "Secure Payment", desc: "256-bit encrypted" },
                  { icon: CreditCard, title: "Instant Delivery", desc: "Credits added immediately" },
                ].map((benefit) => (
                  <div key={benefit.title} className="flex items-center gap-3 text-sm">
                    <benefit.icon className="h-5 w-5 text-primary flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">{benefit.title}</div>
                      <div className="text-xs text-muted-foreground">{benefit.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-28">
                <div className="card-dark">
                  <h3 className="text-lg font-semibold text-foreground mb-4 font-heading">Order Summary</h3>

                  <AnimatePresence mode="wait">
                    {selected ? (
                      <motion.div
                        key={selected.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="space-y-3 mb-6">
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground/70">{selected.name} Package</span>
                            <span className="text-foreground font-medium">${selected.price}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground/70">Credits</span>
                            <span className="text-primary font-mono-data font-bold">{selected.credits}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-foreground/70">Per card</span>
                            <span className="text-foreground/70">${selected.pricePerCredit.toFixed(2)}</span>
                          </div>
                          {selected.savings && (
                            <div className="flex justify-between text-sm">
                              <span className="text-success">You save</span>
                              <span className="text-success font-medium">${selected.savings}</span>
                            </div>
                          )}
                        </div>

                        <div className="border-t border-border pt-4 mb-4">
                          <div className="flex justify-between">
                            <span className="font-semibold text-foreground">Total</span>
                            <span className="text-2xl font-bold text-foreground font-mono-data">
                              ${selected.price}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            New balance: {currentCredits + selected.credits} credits
                          </div>
                        </div>

                        <Button className="w-full bg-primary text-primary-foreground hover:brightness-110 font-semibold shadow-neon h-12 text-base">
                          <ShoppingCart className="mr-2 h-5 w-5" />
                          Purchase Credits
                        </Button>

                        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-muted-foreground">
                          <Lock className="h-3 w-3" />
                          Secured by Stripe
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-8"
                      >
                        <ShoppingCart className="h-10 w-10 text-foreground/20 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Select a package to continue
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Features list */}
                <div className="mt-4 card-dark">
                  <h4 className="text-sm font-semibold text-foreground mb-3">Every credit includes:</h4>
                  <ul className="space-y-2">
                    {[
                      "Full day of predictions for any track",
                      "Both Concert™ & Aptitude™ algorithms",
                      "Instant PDF download",
                      "Unlimited re-downloads",
                    ].map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-foreground/70">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BuyCredits;
