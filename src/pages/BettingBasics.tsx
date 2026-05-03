import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, BookOpen, Coins, Shield, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";

type SectionBlock = {
  id: string;
  icon: typeof Heart;
  title: string;
  body: ReactNode[];
};

const sections: SectionBlock[] = [
  {
    id: "fun",
    icon: Heart,
    title: "Why horse racing is fun",
    body: [
      "Horse racing is a live sport with real athletes — equine and human — and every race tells a small story: who found their best stride, who got the trip, who surprised the crowd.",
      "For many fans, the fun is social: a day at the track or a watch party, comparing notes with friends, and feeling the build-up as the field turns for home.",
      "There is also a puzzle to it. Past performances, pace, class, and surface can all matter. You do not need to be an expert to enjoy the spectacle — but learning a little can make each race more interesting.",
    ],
  },
  {
    id: "basics",
    icon: BookOpen,
    title: "The basics, without the jargon storm",
    body: [
      "A racecard lists the horses, post positions, and often recent form. Odds reflect how much the betting public favors each runner — they move as money comes in.",
      <>
        Common bet types include <span className="text-neon font-bold">win</span> (first only),{" "}
        <span className="text-neon font-bold">place</span> (first or second), and{" "}
        <span className="text-neon font-bold">show</span> (1st, 2nd, and 3rd). “Exotic” bets like{" "}
        <span className="text-neon font-bold">exactas</span>, <span className="text-neon font-bold">daily doubles</span>,{" "}
        <span className="text-neon font-bold">trifectas</span>, etc. ask you to predict finishing order for multiple horses —
        they are harder and more volatile.
      </>,
      "Nothing in racing is guaranteed. Favorites lose often. Long shots win sometimes. That uncertainty is part of the sport — and a good reason to keep any wagering small and intentional.",
    ],
  },
  {
    id: "mindset",
    icon: Coins,
    title: "A healthy mindset",
    body: [
      "Treat any money you might wager as entertainment — like tickets to a concert — not as an investment strategy.",
      "Decide what you are comfortable spending before you play, and step away when it stops feeling fun. Chasing losses is the fastest way to turn excitement into stress.",
      "If you use DATAEEL RaceCards, remember they are built to add insight and structure to your reading of a race — not to promise outcomes.",
    ],
  },
  {
    id: "responsible",
    icon: Shield,
    title: "Play smart, stay in bounds",
    body: [
      "Rules, minimum ages, and what is legal vary by place and operator. Always follow the laws where you are and the rules of any licensed platform you use.",
      "If gambling ever feels like it is controlling your time, mood, or money, pause and reach out to a national helpline or local support organization. Asking for help is a strong move.",
    ],
  },
];

const BettingBasics = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <section
        className="pt-28 pb-16 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(232 59% 8%) 0%, hsl(214 52% 20%) 100%)",
        }}
      >
        <div className="container mx-auto px-4 relative">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-8 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-primary font-medium text-sm uppercase tracking-wide mb-3">Learn</p>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-heading tracking-tight mb-4">
              The basics of horse betting
            </h1>
            <p className="text-lg text-foreground/75 leading-relaxed mb-6">
              A friendly primer on why people love the races, how bets are usually described, and how to keep the hobby
              on the fun side of the line. No hype — just enough to feel oriented.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-primary text-primary-foreground hover:brightness-110">
                <Link to="/auth?mode=signup">Create an account</Link>
              </Button>
              <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
                <Link to="/disclaimer">Disclaimer &amp; risk</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 space-y-14">
          {sections.map((s, i) => (
            <motion.article
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="scroll-mt-28"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-heading mb-4">{s.title}</h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    {s.body.map((p, j) => (
                      <p key={`${s.id}-${j}`}>{p}</p>
                    ))}
                  </div>
                </div>
              </div>
            </motion.article>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-8 flex flex-col sm:flex-row sm:items-center gap-6"
          >
            <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground font-heading mb-2">Ask DATAEEL&apos;s assistant</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Logged-in members see a DATAEEL bubble on screen. Use it for short questions about racing vocabulary,
                bet types, and how to think about a race — not for &quot;picks&quot; or guarantees.
              </p>
            </div>
            <Button asChild variant="secondary" className="shrink-0">
              <Link to="/auth?mode=login">Log in to chat</Link>
            </Button>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default BettingBasics;
