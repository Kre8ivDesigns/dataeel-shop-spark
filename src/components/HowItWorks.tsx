import { motion } from "framer-motion";
import { Eye, MapPin, Download, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: Eye,
    number: "01",
    title: "Preview the RaceCard",
    description:
      "Start with the sample RaceCard and see the exact format before creating an account or buying credits.",
  },
  {
    icon: MapPin,
    number: "02",
    title: "Browse Running Tracks",
    description:
      "Check which RaceCards are available by track and date across major thoroughbred venues including Churchill Downs, Santa Anita, Gulfstream Park, and more.",
  },
  {
    icon: Download,
    number: "03",
    title: "Unlock When Ready",
    description:
      "Create a free account only when you are ready to download. One credit unlocks a full race day for a specific track.",
  },
  {
    icon: Trophy,
    number: "04",
    title: "Enjoy the Races",
    description:
      "No software, no learning curve. Just follow the picks from our algorithms and enjoy a simplified and honest approach to Horse Racing.",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="badge-neon mb-4 inline-block">How It Works</span>
          <h2 className="section-title mb-4">
            See Value Before You{" "}
            <span className="text-neon">Sign Up</span>
          </h2>
          <p className="section-subtitle">
            Preview the product, browse the available tracks, then unlock a RaceCard only when it fits your race day.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto"
        >
          {steps.map((step, index) => (
            <motion.div key={step.number} variants={itemVariants} className="relative">
              <div className="card-dark relative z-10 h-full text-center group">
                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  Step {step.number}
                </div>

                {/* Icon */}
                <div className="w-16 h-16 mx-auto mb-5 rounded-xl flex items-center justify-center bg-primary/10 transition-transform duration-200 group-hover:scale-110">
                  <step.icon className="h-8 w-8 text-primary" />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-foreground mb-3 font-heading">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-16"
        >
          <Link to="/racecards">
            <Button
              size="lg"
              className="btn-neon text-lg px-8 py-6 h-auto"
            >
              Browse RaceCards
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Preview first what race days are available. Sign up for a free account with ready. 1 credit per RaceCard
          </p>
        </motion.div>
      </div>
    </section>
  );
};
