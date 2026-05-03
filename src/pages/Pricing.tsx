import { motion } from "framer-motion";
import { Check, Zap, Crown, ArrowLeft, Shield, CreditCard, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  useCreditPackages,
  packageFeatureBullets,
  packagePriceTagline,
  popularPackageIndex,
  packageCtaLabel,
  savingsVsSmallestCreditBundle,
  formatPackageUsd,
} from "@/lib/queries/creditPackages";

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

function PricingPageSkeleton() {
  return (
    <div className="grid gap-6 max-w-7xl mx-auto items-stretch justify-center [grid-template-columns:repeat(auto-fill,minmax(220px,280px))]">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-xl p-6 card-dark animate-pulse flex flex-col min-h-[280px]"
          aria-hidden
        >
          <div className="h-5 bg-muted rounded w-24 mx-auto mb-3" />
          <div className="h-3 bg-muted rounded w-full mb-4" />
          <div className="h-10 bg-muted rounded w-20 mx-auto mb-4" />
          <div className="space-y-2 flex-1">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-3 bg-muted rounded w-full" />
            ))}
          </div>
          <div className="h-10 bg-muted rounded w-full mt-6" />
        </div>
      ))}
    </div>
  );
}

const PricingPage = () => {
  const { data: packages = [], isLoading, isError, error, refetch } = useCreditPackages();
  const popularIdx = popularPackageIndex(packages.length);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section
        className="pt-24 pb-6 md:pb-8 relative overflow-hidden lg:pt-[5.5rem] lg:pb-6"
        style={{
          background: "linear-gradient(135deg, hsl(232 59% 8%) 0%, hsl(214 52% 20%) 100%)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 md:w-96 md:h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 md:w-80 md:h-80 bg-warning/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-3 md:mb-4 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto"
          >
            <span className="badge-neon mb-2 md:mb-3 inline-block text-xs md:text-sm py-1">Simple Pricing</span>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 md:mb-4 font-heading tracking-tight lg:text-[2.75rem] lg:leading-tight">
              Credit Packages for <span className="text-neon">Every Bettor</span>
            </h1>
            <p className="text-sm md:text-base text-foreground/60 max-w-2xl mx-auto leading-relaxed">
              Buy credits, use them anytime. One credit = one full day of predictions for any track. No
              subscriptions, no hidden fees.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-4 md:py-5 bg-card border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-5 md:gap-10 lg:gap-14">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-3 text-center md:text-left"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground text-sm">{benefit.title}</div>
                  <div className="text-xs text-muted-foreground hidden md:block">{benefit.description}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 md:py-10 lg:py-12">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <PricingPageSkeleton />
          ) : isError ? (
            <div className="max-w-lg mx-auto text-center rounded-xl border border-border bg-card p-8">
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : "Could not load pricing."}
              </p>
              <Button type="button" variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            </div>
          ) : packages.length === 0 ? (
            <p className="text-center text-muted-foreground max-w-md mx-auto">
              No packages are configured yet. Please check back later.
            </p>
          ) : (
            <>
              <div className="grid gap-6 max-w-7xl mx-auto items-stretch justify-center [grid-template-columns:repeat(auto-fill,minmax(220px,280px))]">
                {packages.map((plan, index) => {
                  const popular = index === popularIdx;
                  const bullets = packageFeatureBullets(plan);
                  const savings = savingsVsSmallestCreditBundle(plan, packages);
                  const subtitle =
                    plan.description?.trim() ||
                    (plan.unlimited_credits ? "Unlimited RaceCard PDFs" : "Credit bundle");

                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className={`relative rounded-xl p-6 flex flex-col h-full transition-all duration-200 ${
                        popular
                          ? "bg-secondary border-2 border-primary shadow-neon lg:scale-[1.03] z-10"
                          : "card-dark"
                      }`}
                    >
                      {popular && (
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                          <div className="badge-neon flex items-center gap-1.5">
                            <Crown className="h-4 w-4" />
                            Best value
                          </div>
                        </div>
                      )}

                      <div className="text-center mb-4">
                        <h3 className="text-lg font-bold mb-1 text-foreground font-heading">{plan.name}</h3>
                        <p className="text-xs text-muted-foreground">{subtitle}</p>
                      </div>

                      <div className="text-center mb-4">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold text-foreground font-mono">
                            {formatPackageUsd(plan.price)}
                          </span>
                        </div>
                        <div className="text-xs mt-1 text-muted-foreground">{packagePriceTagline(plan)}</div>
                        {savings != null && (
                          <div className="mt-2">
                            <span className="text-xs font-semibold text-success">
                              Save {formatPackageUsd(savings)}
                            </span>
                          </div>
                        )}
                      </div>

                      <ul className="space-y-2 flex-1">
                        {bullets.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 flex-shrink-0 mt-0.5 text-primary" />
                            <span className="text-xs text-foreground/80">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-auto w-full pt-6">
                        <Button
                          asChild
                          className={`w-full font-semibold ${
                            popular
                              ? "bg-primary text-primary-foreground hover:brightness-110 shadow-neon"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          <Link to={`/buy-credits?packageId=${plan.id}`}>
                            {packageCtaLabel(plan)}
                            {popular && <Zap className="ml-2 h-4 w-4" />}
                          </Link>
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-center mt-16 max-w-2xl mx-auto"
              >
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-semibold text-foreground mb-2 font-heading">
                    How does this compare to traditional handicapping?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    A single day at the track often costs much more in forms, tip sheets, and programs than
                    our algorithmic RaceCards, with package prices set to the amounts you see above.
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </section>

      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8 font-heading">Pricing FAQs</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                q: "What is a credit?",
                a: "One credit = one RaceCard download. A RaceCard contains all race predictions for a single track on a single day.",
              },
              {
                q: "Do credits expire?",
                a: "No! Your credits never expire. Buy them when convenient and use them whenever you're ready to hit the track.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and PayPal. All transactions are securely processed.",
              },
              {
                q: "Can I get a refund?",
                a: "Unused credits can be refunded within 30 days of purchase. Contact our support team for assistance.",
              },
            ].map((faq, i) => (
              <div key={i} className="card-dark">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PricingPage;
