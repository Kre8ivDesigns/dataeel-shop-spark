import { motion } from "framer-motion";
import { TrendingUp, Trophy, Target, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const stats = [
  { number: "4", label: "Winners", sublabel: "Tampa Bay Downs", icon: Trophy, color: "gold" },
  { number: "6", label: "Winners", sublabel: "Santa Anita", icon: Trophy, color: "racing-green" },
  { number: "TRIFECTA", label: "Hit!", sublabel: "Fair Grounds", icon: Target, color: "warm-red" },
  { number: "PICK 3", label: "Winner", sublabel: "Gulfstream Park", icon: Zap, color: "gold" },
];

const recentWins = [
  {
    track: "Tampa Bay Downs",
    date: "Jan 30, 2026",
    algorithm: "Concert",
    results: "Winners in Race #1, #4, #6, #9",
    type: "winner",
  },
  {
    track: "Fair Grounds",
    date: "Jan 30, 2026",
    algorithm: "Concert",
    results: "TRIFECTA hit in Race #6",
    type: "trifecta",
  },
  {
    track: "Gulfstream Park",
    date: "Jan 29, 2026",
    algorithm: "Aptitude",
    results: "Winners in Race #1, #2, #8, #9",
    type: "winner",
  },
  {
    track: "Santa Anita",
    date: "Jan 25, 2026",
    algorithm: "Aptitude",
    results: "6 Winners, PICK 3, DAILY DOUBLE, EXACTA",
    type: "multiple",
  },
];

export const Results = () => {
  return (
    <section id="results" className="py-24 bg-navy relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-64 h-64 border border-racing-green rounded-full" />
        <div className="absolute bottom-20 right-20 w-48 h-48 border border-gold rounded-full" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-racing-green/20 text-racing-green text-sm font-semibold mb-4">
            Proven Results
          </span>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            See Our Algorithms{" "}
            <span className="text-gradient">In Action</span>
          </h2>
          <p className="text-lg text-white/70 max-w-2xl mx-auto">
            Real results from real races. Our Concert and Aptitude algorithms
            consistently deliver winning picks across all major tracks.
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * index }}
              className="glass-card text-center group hover:bg-white/15 transition-all"
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4 ${
                  stat.color === "gold"
                    ? "bg-gold/20"
                    : stat.color === "warm-red"
                    ? "bg-warm-red/20"
                    : "bg-racing-green/20"
                }`}
              >
                <stat.icon
                  className={`h-6 w-6 ${
                    stat.color === "gold"
                      ? "text-gold"
                      : stat.color === "warm-red"
                      ? "text-warm-red"
                      : "text-racing-green"
                  }`}
                />
              </div>
              <div
                className={`text-3xl md:text-4xl font-bold mb-1 font-mono ${
                  stat.color === "gold"
                    ? "text-gold"
                    : stat.color === "warm-red"
                    ? "text-warm-red"
                    : "text-racing-green"
                }`}
              >
                {stat.number}
              </div>
              <div className="text-white font-medium">{stat.label}</div>
              <div className="text-white/50 text-sm">{stat.sublabel}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Recent Wins Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="max-w-3xl mx-auto"
        >
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-racing-green" />
            Recent Algorithm Wins
          </h3>

          <div className="space-y-4">
            {recentWins.map((win, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * index }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
              >
                <div
                  className={`w-2 h-12 rounded-full ${
                    win.type === "trifecta"
                      ? "bg-warm-red"
                      : win.type === "multiple"
                      ? "bg-gold"
                      : "bg-racing-green"
                  }`}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white">{win.track}</span>
                    <span className="px-2 py-0.5 rounded-full bg-racing-green/20 text-racing-green text-xs font-medium">
                      {win.algorithm}
                    </span>
                  </div>
                  <p className="text-white/80 text-sm">{win.results}</p>
                </div>
                <span className="text-white/40 text-sm whitespace-nowrap">
                  {win.date}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              View All Results
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
