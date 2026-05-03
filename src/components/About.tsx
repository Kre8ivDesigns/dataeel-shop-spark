import { motion } from "framer-motion";
import { Award, Database, Brain, Users, TrendingUp, BarChart3 } from "lucide-react";

const team = [
  {
    role: "Computer Scientist",
    experience: "35+ years",
    description: "Algorithm development and data engineering expertise powering Concert™ and Aptitude™",
    icon: Brain,
  },
  {
    role: "Veteran Handicapper",
    experience: "40+ years",
    description: "Deep racing knowledge and refined handicapping from decades at the track",
    icon: Award,
  },
  {
    role: "Racing Operations",
    experience: "22+ years",
    description: "Track-level insights and industry connections across US and Canadian racetracks",
    icon: Users,
  },
];

const highlights = [
  { number: "97+", label: "Years Combined Experience" },
  { number: "28+", label: "Racetracks Covered" },
  { number: "2", label: "Proprietary Algorithms" },
  { number: "1000s", label: "Winners Predicted" },
];

export const About = () => {
  return (
    <section id="about" className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center max-w-6xl mx-auto">
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="badge-neon mb-4 inline-block">About DATAEEL</span>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight font-heading">
              Data-Driven Racing.{" "}
              <span className="text-neon">Winning Results.</span>
            </h2>

            {/* Quote from original site */}
            <div className="mb-6 pl-4 border-l-2 border-primary">
              <p className="text-lg text-foreground/80 italic">
                "How about a simplified and honest approach to Horse Racing?"
              </p>
            </div>

            <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
              DATA<strong className="text-foreground">EEL</strong>™ has arrived – Algorithms
              for thoroughbred horse racing like no other. Are you NEW to horse racing?
              Or maybe a seasoned player? DATA<strong className="text-foreground">EEL</strong>™
              will change your horse racing life.
            </p>
            <p className="text-base text-muted-foreground mb-8 leading-relaxed">
              DATA<strong className="text-foreground">EEL</strong>™ provides horse racing
              predictions powered by two proprietary algorithms—Concert™ and Aptitude™—that
              analyze race data from Equibase® to generate simplified predictions for
              everyday bettors. No complicated handicapping required.
            </p>

            {/* Equibase Badge */}
            <div className="inline-flex items-center gap-3 p-4 rounded-xl bg-muted border border-border mb-8">
              <Database className="h-8 w-8 text-primary" />
              <div>
                <div className="font-semibold text-foreground">Powered by Equibase® Data</div>
                <div className="text-sm text-muted-foreground">
                  The official data provider for North American racing
                </div>
              </div>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 gap-4">
              {highlights.map((highlight, index) => (
                <motion.div
                  key={highlight.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * index }}
                  className="stat-card"
                >
                  <div className="stat-number text-3xl">
                    {highlight.number}
                  </div>
                  <div className="stat-label">
                    {highlight.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Team & Algorithms */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-foreground mb-6 font-heading">The Team Behind DATAEEL</h3>

            {team.map((member, index) => (
              <motion.div
                key={member.role}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + 0.1 * index }}
                className="card-dark flex items-start gap-4"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <member.icon className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{member.role}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-medium">
                      {member.experience}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </div>
              </motion.div>
            ))}

            {/* Algorithms */}
            <div className="mt-8 p-6 rounded-xl bg-secondary border border-border">
              <h4 className="text-lg font-semibold mb-4 text-foreground font-heading">Our Algorithms</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-primary font-bold">Concert™</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Analyzes past live performance – how horses perform under pressure,
                    in front of the crowd, from gate to finish
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-background/50 border border-border">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-warning" />
                    <span className="text-warning font-bold">Aptitude™</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Evaluates inherent ability and future potential – running style,
                    pace, stamina, and capability
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
