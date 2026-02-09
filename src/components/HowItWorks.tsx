import { motion } from "framer-motion";
import { UserPlus, MapPin, Download, Trophy, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Register for FREE",
    description: "Registration is FREE and gives you access to see which racetracks are running with EEL RaceCards this week. Also get access to theDATA EEL™ newsletter.",
  },
  {
    icon: MapPin,
    number: "02",
    title: "Choose Your Track",
    description: "Select from 28+ racetracks across the U.S. and Canada. We cover all major venues every race day including Churchill Downs, Santa Anita, Gulfstream Park, and more.",
  },
  {
    icon: Download,
    number: "03",
    title: "Buy Credits & Download",
    description: "Purchase credits from the Dashboard menu after login. 1 Credit = 1 full day of EEL RaceCard predictions for any track. Simple PDF download, instant access.",
  },
  {
    icon: Trophy,
    number: "04",
    title: "Enjoy the Races",
    description: "No software, no learning curve. Just follow the Concert™ and Aptitude™ picks and enjoy a simplified and honest approach to Horse Racing.",
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
            Four Simple Steps to{" "}
            <span className="text-neon">Winning Picks</span>
          </h2>
          <p className="section-subtitle">
            Horse Racing Simplified® – No complicated handicapping. No hours of research.
            Just algorithmic predictions delivered straight to you.
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
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            Registration is FREE · 1 Credit per RaceCard
          </p>
        </motion.div>
      </div>
    </section>
  );
};
