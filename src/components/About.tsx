import { motion } from "framer-motion";
import { Award, Database, Brain, Users } from "lucide-react";

const team = [
  {
    role: "Computer Scientist",
    experience: "35+ years",
    description: "Algorithm development and data engineering expertise",
    icon: Brain,
  },
  {
    role: "Veteran Handicapper",
    experience: "40+ years",
    description: "Deep racing knowledge and pattern recognition",
    icon: Award,
  },
  {
    role: "Racing Operations",
    experience: "22+ years",
    description: "Track-level insights and industry connections",
    icon: Users,
  },
];

const highlights = [
  { number: "97+", label: "Years Combined Experience" },
  { number: "30+", label: "Racetracks Covered" },
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
            <span className="inline-block px-4 py-1.5 rounded-full bg-navy/10 text-navy text-sm font-semibold mb-4">
              About DATAEEL
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-charcoal mb-6 leading-tight">
              97+ Years of Racing Expertise,{" "}
              <span className="text-racing-green">Powered by Algorithms</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              DATAEEL was born from a simple question: What if we could take decades of
              handicapping expertise and combine it with modern data science? The result
              is two proprietary algorithms—Concert and Aptitude—that analyze race data
              from Equibase® to generate simplified predictions for everyday bettors.
            </p>

            {/* Equibase Badge */}
            <div className="inline-flex items-center gap-3 p-4 rounded-xl bg-muted border border-border mb-8">
              <Database className="h-8 w-8 text-racing-green" />
              <div>
                <div className="font-semibold text-charcoal">Powered by Equibase® Data</div>
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
                  className="text-center p-4 rounded-xl bg-muted"
                >
                  <div className="text-3xl font-bold text-racing-green font-mono">
                    {highlight.number}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {highlight.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Team */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-charcoal mb-6">The Team Behind DATAEEL</h3>

            {team.map((member, index) => (
              <motion.div
                key={member.role}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + 0.1 * index }}
                className="card-elevated flex items-start gap-4"
              >
                <div className="w-14 h-14 rounded-xl bg-racing-green/10 flex items-center justify-center flex-shrink-0">
                  <member.icon className="h-7 w-7 text-racing-green" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-charcoal">{member.role}</h4>
                    <span className="px-2 py-0.5 rounded-full bg-gold/20 text-gold text-xs font-medium">
                      {member.experience}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-sm">{member.description}</p>
                </div>
              </motion.div>
            ))}

            {/* Algorithms */}
            <div className="mt-8 p-6 rounded-2xl bg-navy text-white">
              <h4 className="text-lg font-semibold mb-4">Our Algorithms</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/10">
                  <div className="text-racing-green font-bold mb-1">Concert</div>
                  <p className="text-sm text-white/70">
                    Analyzes pace scenarios and class patterns
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/10">
                  <div className="text-gold font-bold mb-1">Aptitude</div>
                  <p className="text-sm text-white/70">
                    Evaluates form, fitness, and track bias
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
