import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  BookOpen,
  CircleDot,
  Columns2,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import racecardExampleImage from "@/assets/racecard-guide/racecard-guide-page-02.webp";
import racecardColumnsImage from "@/assets/racecard-guide/racecard-guide-page-03.webp";
import racecardFormatImage from "@/assets/racecard-guide/racecard-guide-page-04.webp";
import racecardAlgorithmsImage from "@/assets/racecard-guide/racecard-guide-page-05.webp";
import racecardNoDataImage from "@/assets/racecard-guide/racecard-guide-page-07.webp";

/**
 * Educational content adapted from DATAEEL RaceCard instructions (Nov 2024).
 * Not legal or wagering advice — explains on-page labels and algorithms.
 */

const sections: {
  id: string;
  icon: typeof BookOpen;
  title: string;
  paragraphs: string[];
  image?: {
    src: string;
    alt: string;
    caption: string;
  };
}[] = [
  {
    id: "why-dataeel",
    icon: Sparkles,
    title: "What the RaceCard is for",
    paragraphs: [
      "DATAEEL™ prediction algorithms are built for several audiences: newcomers to thoroughbred racing, experienced handicappers who want to shorten form study, and players who follow multiple tracks in a day and want a structured read.",
      "The aim is to give a straightforward way to think about which horses may finish in the money, keep the game fun and lower-stress, and offer an easy on-ramp to the sport.",
      "There is also an introductory video, “A Complete Introduction to the DATAEEL,” if you prefer to watch before you read.",
    ],
  },
  {
    id: "in-the-money",
    icon: CircleDot,
    title: "“In the money”",
    paragraphs: [
      'In this guide, a horse is “in the money” when it finishes 1st, 2nd, or 3rd. A win is 1st; place is 2nd; show is 3rd — win, place, and show bets all correspond to those finishes.',
    ],
  },
  {
    id: "lesson-1",
    icon: BookOpen,
    title: "Lesson 1 — Understanding the format",
    paragraphs: [
      "Each EEL RaceCard is printed for one track and race date. At the top you will see the track name, date, and often a Sunny/Cloudy vs Rain edition note where applicable.",
      "The large block of text under the race header is the conditions of the race: distance, surface (for example Turf or Dirt), purse, who can enter (age, sex, claiming or allowance rules), and weights. The race number and estimated post time tell you which race you are looking at and when it is expected to run.",
      "Down the middle of the sheet, opening odds appear for each horse. Those are initial morning-line–style figures set ahead of time; if a horse attracts more money, its odds often shorten (smaller payout if it wins); if it is ignored, odds may lengthen (larger payout).",
      "Each horse has a program number (sometimes with a letter) and a name so you can match the card to the tote, program, and results.",
    ],
    image: {
      src: racecardFormatImage,
      alt: "Annotated RaceCard format showing race number, post time, surface, race type, distance, horse names, numbers, and odds.",
      caption: "Race header, conditions, horse identifiers, and opening odds.",
    },
  },
  {
    id: "two-columns",
    icon: Columns2,
    title: "The two prediction tables",
    paragraphs: [
      "On a typical page, the left-hand ranked list is Concert™, and the right-hand list is Aptitude™. Same horses, two different orderings — see the next sections for what each measures.",
    ],
    image: {
      src: racecardColumnsImage,
      alt: "Annotated EEL RaceCard showing Concert on the left table and Aptitude on the right table.",
      caption: "Concert is shown on the left; Aptitude is shown on the right.",
    },
  },
  {
    id: "lesson-2",
    icon: Columns2,
    title: "Lesson 2 — Concert™ and Aptitude™",
    paragraphs: [
      "Concert™ draws primarily on how a horse has already performed — its “live” record under race-day pressure. Think of a band on stage: Concert reflects how the last performances went in front of the crowd.",
      "Aptitude™ weighs factors that speak more to current potential and trajectory — including running-style tendencies — so it is oriented toward how the horse may perform looking forward.",
      "The two numbers are not two versions of the same thing. Concert and Aptitude are separate models with separate inputs; they often disagree on order, and that is expected.",
      "Each algorithm ranks horses from top toward bottom: higher on the list means relatively more likely to be in the money under that model; lower means relatively less likely — for that algorithm only.",
    ],
    image: {
      src: racecardAlgorithmsImage,
      alt: "RaceCard lesson page explaining Concert and Aptitude algorithms and top-to-bottom ranking.",
      caption: "Concert and Aptitude are separate ranked opinions on the same race.",
    },
  },
  {
    id: "lesson-3",
    icon: ArrowRight,
    title: "Lesson 3 — Using Concert™, Aptitude™, or both",
    paragraphs: [
      "Because the lists can differ, look for overlap when both models put the same horse toward the top — that can be a strong hint. When they disagree on who is best, neither is “wrong”; you decide whether you lean Concert-, Aptitude-, or blend both — some players mix the reads race by race and call that “doing the weave.”",
      "Over time, tracking which approach matches how you like to bet can build intuition for which column to weight more on similar races.",
    ],
  },
  {
    id: "lesson-4",
    icon: AlertCircle,
    title: "Lesson 4 — When there isn’t enough data",
    paragraphs: [
      "Sometimes Concert™ or Aptitude™ cannot produce a reliable score for a horse — for example in many maiden fields where several runners have little or no meaningful past performance. On the PDF this state is shown with a special marker instead of a numeric score.",
      "If you see that marker, treat it as “no usable prediction from this algorithm for this horse,” not as proof the horse is bad. Those runners may still be grouped toward the bottom of the list for layout only; order among marked horses is not meaningful.",
      "A horse that wins despite missing data is sometimes called a “sleeper” — the sheet did not have enough history to spotlight it, but the race itself told the story.",
    ],
    image: {
      src: racecardNoDataImage,
      alt: "RaceCard lesson page showing x values where there is not enough data to calculate a prediction.",
      caption: "An x means the algorithm does not have enough data to calculate a prediction.",
    },
  },
];

const HowToReadRacecard = () => {
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

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] lg:items-center"
          >
            <div>
              <p className="text-primary font-medium text-sm uppercase tracking-wide mb-3">Guide</p>
              <h1 className="text-4xl md:text-5xl font-bold text-foreground font-heading tracking-tight mb-4">
                How to read the RaceCard
              </h1>
              <p className="text-lg text-foreground/75 leading-relaxed mb-6 max-w-3xl">
                A plain-language walkthrough of the EEL RaceCard layout, what Concert™ and Aptitude™ mean, and how to
                interpret rankings — adapted from DATAEEL instructional materials.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-primary text-primary-foreground hover:brightness-110">
                  <Link to="/racecards">Browse RaceCards</Link>
                </Button>
                <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
                  <Link to="/betting-basics">Betting basics</Link>
                </Button>
              </div>
            </div>

            <figure className="overflow-hidden rounded-xl border border-white/10 bg-background/20 shadow-2xl">
              <img
                src={racecardExampleImage}
                alt="Example EEL RaceCard page with race header, Concert table, Aptitude table, and note area."
                className="h-full max-h-[430px] w-full object-cover object-top"
                loading="eager"
                decoding="async"
              />
            </figure>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 space-y-14 max-w-5xl">
          {sections.map((s, i) => (
            <motion.article
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              className="scroll-mt-28"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <s.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold text-foreground font-heading mb-4">{s.title}</h2>
                  <div className="space-y-4 text-muted-foreground leading-relaxed">
                    {s.paragraphs.map((p, j) => (
                      <p key={`${s.id}-${j}`}>{p}</p>
                    ))}
                  </div>
                  {s.image && (
                    <figure className="mt-7 overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                      <img
                        src={s.image.src}
                        alt={s.image.alt}
                        className="w-full bg-white"
                        loading="lazy"
                        decoding="async"
                      />
                      <figcaption className="border-t border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
                        {s.image.caption}
                      </figcaption>
                    </figure>
                  )}
                </div>
              </div>
            </motion.article>
          ))}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground"
          >
            <p>
              Racing involves risk. RaceCards are informational tools, not guarantees of outcome. See our{" "}
              <Link to="/disclaimer" className="text-primary underline underline-offset-4 hover:text-primary/90">
                disclaimer
              </Link>{" "}
              for limitations of use.
            </p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HowToReadRacecard;
