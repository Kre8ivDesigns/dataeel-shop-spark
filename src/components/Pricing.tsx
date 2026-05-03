import { motion } from "framer-motion";
import { Check, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  useCreditPackages,
  savingsVsSmallestCreditBundle,
  PRICING_STANDARD_FEATURES,
  PRICING_UNLIMITED_FEATURES,
} from "@/lib/queries/creditPackages";

/**
 * Homepage pricing strip: same query as /pricing (`credit_packages` ordered by price).
 * Matches full Pricing page — do not use purchasableOnly here or packages without
 * `stripe_price_id` vanish from the homepage while still appearing on /pricing.
 */
export const Pricing = () => {
  const { data: packages = [], isLoading, isError } = useCreditPackages();

  return (
    <section id="pricing" className="py-24 bg-background relative overflow-hidden">
      <div
        className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none"
        aria-hidden
      />

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="badge-neon mb-4 inline-block">Simple Pricing</span>
          <h2 className="section-title mb-4">
            Credit Packages for{" "}
            <span className="text-neon">Every Bettor</span>
          </h2>
          <p className="section-subtitle">
            Buy credits, use them anytime. One credit = one full day of predictions for any track.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : isError ? (
          <p className="text-center text-muted-foreground">
            Pricing unavailable.{" "}
            <Link to="/pricing" className="text-primary underline">
              View pricing page
            </Link>
          </p>
        ) : packages.length === 0 ? (
          <p className="text-center text-muted-foreground">
            Packages coming soon.{" "}
            <Link to="/pricing" className="text-primary underline">
              Pricing
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 max-w-7xl mx-auto items-stretch sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg, index) => {
              const isUnlimited = pkg.unlimited_credits;
              const pricePerCredit =
                !isUnlimited && pkg.credits > 0 ? pkg.price / pkg.credits : null;
              const savings = savingsVsSmallestCreditBundle(pkg, packages);
              const featureLines = isUnlimited
                ? [...PRICING_UNLIMITED_FEATURES].slice(0, 4)
                : [
                    `${pkg.credits} RaceCard download${pkg.credits === 1 ? "" : "s"}`,
                    ...PRICING_STANDARD_FEATURES.slice(0, 3),
                  ];

              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  className="relative flex flex-col h-full rounded-xl p-8 transition-all duration-200 card-dark"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold mb-2 text-foreground font-heading">
                      {pkg.name}
                    </h3>
                    <p className="text-sm text-muted-foreground min-h-[2.5rem]">
                      {pkg.description?.trim() ||
                        (isUnlimited ? "Unlimited RaceCard PDF downloads" : "Credit package")}
                    </p>
                  </div>

                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-5xl font-bold text-foreground font-mono">
                        ${pkg.price}
                      </span>
                    </div>
                    <div className="text-sm mt-2 text-muted-foreground">
                      {isUnlimited ? (
                        <>Unlimited RaceCard PDF downloads · one-time purchase</>
                      ) : (
                        <>
                          {pkg.credits} credits
                          {pricePerCredit != null && (
                            <> · ${pricePerCredit.toFixed(2)} per RaceCard</>
                          )}
                        </>
                      )}
                    </div>
                    {savings != null && (
                      <div className="mt-2">
                        <span className="text-sm font-semibold text-success">
                          Save ${savings.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <ul className="space-y-3 flex-1">
                    {featureLines.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="h-5 w-5 flex-shrink-0 text-primary" />
                        <span className="text-sm text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto w-full pt-8">
                    <Button
                      asChild
                      className="w-full py-6 font-semibold text-base bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      <Link to={`/buy-credits?packageId=${encodeURIComponent(pkg.id)}`}>
                        {isUnlimited ? "Get unlimited PDF access" : `Choose ${pkg.name}`}
                      </Link>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

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
            className="inline-flex items-center gap-2 mt-4 text-primary font-medium hover:underline"
          >
            View full pricing details
            <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
};
