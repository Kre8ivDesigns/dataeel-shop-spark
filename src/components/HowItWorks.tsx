import { motion } from "framer-motion";
import { MapPin, Download, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  {
    icon: MapPin,
    number: "01",
    title: "Choose Your Track",
    description: "Select from 30+ racetracks across the U.S. and Canada. We cover all major venues every race day.",
    color: "racing-green",
  },
  {
    icon: Download,
    number: "02",
    title: "Download Your RaceCard",
    description: "Get instant access to your EEL RaceCard – a simple PDF with algorithmic predictions for every race.",
    color: "gold",
  },
  {
    icon: Trophy,
    number: "03",
    title: "Enjoy the Races",
    description: "No software, no learning curve. Just follow the picks and have fun at the track or from home.",
    color: "racing-green",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-background relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-racing-green/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-racing-green/10 text-racing-green text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="section-title mb-4">
            Three Simple Steps to{" "}
            <span className="text-racing-green">Better Picks</span>
          </h2>
          <p className="section-subtitle">
            No complicated handicapping. No hours of research. Just algorithmic predictions
            delivered straight to you.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto"
        >
          {steps.map((step, index) => (
            <motion.div key={step.number} variants={itemVariants} className="relative">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-border via-racing-green/30 to-border -translate-x-1/2 z-0" />
              )}

              <div className="card-elevated relative z-10 h-full text-center group">
                {/* Step Number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-navy text-white text-xs font-bold rounded-full">
                  Step {step.number}
                </div>

                {/* Icon */}
                <div
                  className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${
                    step.color === "gold" ? "bg-gold/10" : "bg-racing-green/10"
                  }`}
                >
                  <step.icon
                    className={`h-10 w-10 ${
                      step.color === "gold" ? "text-gold" : "text-racing-green"
                    }`}
                  />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-charcoal mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
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
          <Button
            size="lg"
            className="bg-racing-green hover:bg-racing-green-dark text-white font-semibold px-8 py-6 text-lg shadow-green"
          >
            Start Your Free Trial
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Just $5 for a full day of predictions at any track
          </p>
        </motion.div>
      </div>
    </section>
  );
};
