import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BookOpen, CircleDot, Columns2, Sparkles, AlertCircle, ArrowRight, Play } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import racecardExampleImage from "@/assets/racecard-guide/racecard-guide-page-02-cropped.png";
import racecardColumnsImage from "@/assets/racecard-guide/racecard-guide-page-03.webp";
import racecardFormatImage from "@/assets/racecard-guide/racecard-guide-page-04.webp";
import racecardAlgorithmsImage from "@/assets/racecard-guide/racecard-guide-page-05.webp";
import racecardNoDataImage from "@/assets/racecard-guide/racecard-guide-page-07.webp";
import racecardScratchedHorsesImage from "@/assets/racecard-guide/lesson-5-scratched-horses.png";
import { useState } from "react";

const DEFAULT_INTRO_VIDEO_ID = "_W9FDrVAVrY";

function extractYouTubeVideoId(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed) return DEFAULT_INTRO_VIDEO_ID;

  try {
    const url = new URL(trimmed);
    if (url.hostname === "youtu.be") return url.pathname.replace("/", "") || DEFAULT_INTRO_VIDEO_ID;
    if (url.pathname.startsWith("/embed/")) return url.pathname.split("/")[2] || DEFAULT_INTRO_VIDEO_ID;
    return url.searchParams.get("v") || DEFAULT_INTRO_VIDEO_ID;
  } catch {
    return trimmed;
  }
}

const INTRO_VIDEO_ID = extractYouTubeVideoId(import.meta.env.VITE_DATAEEL_INTRO_VIDEO_URL);
const INTRO_VIDEO_EMBED_URL = `https://www.youtube-nocookie.com/embed/${INTRO_VIDEO_ID}?autoplay=1&rel=0&modestbranding=1`;
const INTRO_VIDEO_COVER_IMAGE = `https://img.youtube.com/vi/${INTRO_VIDEO_ID}/hqdefault.jpg`;

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
      "DATAEEL™ prediction algorithms are built for several audiences: newcomers to thoroughbred racing, experienced handicappers who want to shorten Racing Form study, and players who follow multiple tracks in a day and want a structured read.",
      "The aim is to give a straightforward way to think about which horses may finish in the money, keep the game fun and lower-stress, and offer an easy on-ramp to the sport.",
      "There is also an introductory video, “A Complete Introduction to DATAEEL,” if you prefer to watch before reading the instructions below.",
    ],
  },
  {
    id: "in-the-money",
    icon: CircleDot,
    title: "“In the money”",
    paragraphs: [
      'A horse is “in the money” when it finishes 1st, 2nd, or 3rd. A Win is 1st; Place is 2nd; Show is 3rd — Win, Place, and Show bets all correspond to being "in the money”.',
    ],
  },
  {
    id: "lesson-1",
    icon: BookOpen,
    title: "Lesson 1 — Understanding the format",
    paragraphs: [
      "Each EEL RaceCard is printed for one track and race date. At the top you will see the track name, date, and often a Sunny/Cloudy edition. Note: in the future we plan to release a Rain edition for poor weather days.",
      "The large block of text under the race header is the conditions of the race: distance, surface (for example Turf or Dirt), purse, who can enter (age, sex, claiming or allowance rules), and weights. The race number and estimated post time tell you which race you are looking at and when it is expected to run.",
      "Down the middle of the sheet, opening odds appear for each horse. Those are initial morning-line figures set ahead of time by track authorities. If a horse attracts more money from bettors, its odds shorten (smaller payout if it wins); if a horse is ignored by bettors, odds lengthen (larger payout).",
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
      "On the EEL RaceCard, the left-hand ranked list is Concert™, and the right-hand list is Aptitude™. Same horses, two different orderings — see the next sections for what each measures.",
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
      "Concert™ draws primarily on how a horse has already performed — its “live” record under race-day pressure. Think of a musical band on stage: Concert reflects how the last performances went in front of the crowd.",
      "Aptitude™ weighs factors that speak more to current potential and trajectory — including running-style tendencies — so it is oriented toward how the horse may perform looking forward.",
      "Concert and Aptitude are separate algorithms with separate inputs; they often disagree on ranking, and that is expected.",
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
      "Because the RaceCard lists can differ, look for overlap when both algorithms put the same horse in the top 3 positions — that can be a strong hint. When the algorithm lists disagree on who is best, neither is “wrong”; you choose how much weight to give Concert™ and Aptitude™ for that race, or you can blend both reads if that fits your style.",
      "Over time, tracking which algorithm is performing for you can build intuition for other similar races. Hint: the Aptitude algorithm is very useful for maiden races.",
    ],
  },
  {
    id: "lesson-4",
    icon: AlertCircle,
    title: "Lesson 4 — When there isn’t enough data",
    paragraphs: [
      "Sometimes Concert™ or Aptitude™ cannot produce a reliable score for a horse — for example in many maiden races runners have little or no meaningful past performance. On the PDF this state is shown with an x marker instead of a numeric score.",
      "If you see that marker, treat it as “no usable prediction from this algorithm for this horse,” not as proof the horse is bad. Runners with an x marker will always be grouped toward the bottom of the list for layout only; it does not mean the horse has a poor chance to finish “in the money,” it only means the algorithm cannot give a prediction for the horse.",
      "A horse that wins despite missing data is sometimes called a “sleeper” — the sheet did not have enough history to spotlight it, but the race itself told the story.",
    ],
    image: {
      src: racecardNoDataImage,
      alt: "RaceCard lesson page showing x values where there is not enough data to calculate a prediction.",
      caption: "An x means the algorithm does not have enough data to calculate a prediction.",
    },
  },
  {
    id: "lesson-5",
    icon: AlertCircle,
    title: "Lesson 5 — Scratched Horses: adjusting the RaceCard",
    paragraphs: [
      "If a horse is scratched from a race, cross it off the RaceCard. Draw a horizontal line through the horse name, number, opening odds, and algorithm number so you do not include that horse in your read.",
      "After the scratches are removed, read each algorithm from the remaining horses only. In the example, Outlaw Kid and Biz Biz Buzz were scratched. Due to the scratches, Concert™ picks Talented Man, Determined Kingd, and Matta as the best choices to be in the money.",
      "In that same example, Aptitude™ picks Bourbon Music, Talented Man, and Determined Kingd as the best choices to be in the money.",
    ],
    image: {
      src: racecardScratchedHorsesImage,
      alt: "Lesson 5 example showing scratched horses crossed off in the Concert and Aptitude RaceCard tables.",
      caption: "Cross out scratched horses, then read the remaining horses in each algorithm table.",
    },
  },
];

const HowToReadRacecard = () => {
  const [expandedImage, setExpandedImage] = useState<{
    src: string;
    alt: string;
    caption: string;
  } | null>(null);
  const [videoOpen, setVideoOpen] = useState(false);

  const openImage = (image: { src: string; alt: string; caption: string }) => {
    setExpandedImage(image);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <PageHero
        badge="Guide"
        title={
          <>
            How to read the <span className="text-neon">DATA<strong>EEL</strong> RaceCard</span>
          </>
        }
        subtitle="A plain-language walkthrough of the EEL RaceCard layout, what Concert™ and Aptitude™ mean, and how to interpret rankings — adapted from the DATA<strong>EEL</strong> instructional materials located in the final pages of any RaceCard."
        align="left"
        actions={
          <>
            <Button asChild className="bg-primary text-primary-foreground hover:brightness-110">
              <Link to="/racecards">Browse RaceCards</Link>
            </Button>
            <Button asChild variant="outline" className="border-border text-foreground hover:bg-muted">
              <Link to="/betting-basics">Betting basics</Link>
            </Button>
          </>
        }
        aside={
          <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2 lg:max-w-none">
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/15 bg-black/80 text-left shadow-xl transition hover:border-primary/40 hover:shadow-neon/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="relative aspect-video overflow-hidden bg-black">
                <img
                  src={INTRO_VIDEO_COVER_IMAGE}
                  alt="DATAEEL RaceCard video cover"
                  className="h-full w-full object-cover opacity-85 transition duration-300 group-hover:scale-[1.03] group-hover:opacity-100"
                  loading="eager"
                  decoding="async"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
                <span className="absolute left-1/2 top-1/2 inline-flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-red-600/95 shadow-lg transition group-hover:scale-105">
                  <Play className="h-6 w-6 fill-white text-white" aria-hidden />
                </span>
                <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">See our product</span>
              </div>
              <div className="border-t border-white/10 px-3 py-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400">A Complete Introduction</p>
              </div>
            </button>

            <figure className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-card/90 shadow-2xl">
              <figcaption className="px-3 py-2 text-center text-xs font-medium text-foreground sm:text-sm">
                This is an example of a typical EEL RaceCard
              </figcaption>
              <button
                type="button"
                onClick={() =>
                  openImage({
                    src: racecardExampleImage,
                    alt: "Example EEL RaceCard page with race header, Concert table, Aptitude table, and note area.",
                    caption: "Example EEL RaceCard page with race header, Concert table, Aptitude table, and note area.",
                  })
                }
                className="group block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label="Open larger image: Example EEL RaceCard page with race header, Concert table, Aptitude table, and note area."
              >
                <img
                  src={racecardExampleImage}
                  alt="Example EEL RaceCard page with race header, Concert table, Aptitude table, and note area."
                  className="h-full max-h-[280px] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02] sm:max-h-[300px]"
                  loading="eager"
                  decoding="async"
                />
              </button>
            </figure>
          </div>
        }
        asideGridClassName="lg:grid-cols-[minmax(0,1fr)_minmax(320px,1fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(560px,1.15fr)] lg:items-start gap-8 xl:gap-10"
        sectionClassName="pb-8 lg:pb-12"
      />

      <section className="py-16">
        <div className="mx-auto w-full max-w-[1400px] space-y-14 px-4">
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
                    <figure className="mt-7 max-w-3xl overflow-hidden rounded-xl border border-border bg-card shadow-xl">
                      <button
                        type="button"
                        onClick={() => openImage(s.image)}
                        className="group block w-full cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label={`Open larger image: ${s.image.alt}`}
                      >
                        <img
                          src={s.image.src}
                          alt={s.image.alt}
                          className="w-full bg-white transition-transform duration-300 group-hover:scale-[1.01]"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
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

      <Dialog open={Boolean(expandedImage)} onOpenChange={(open) => !open && setExpandedImage(null)}>
        <DialogContent
          className="flex max-h-[96vh] max-w-[98vw] flex-col border-border bg-card p-3 sm:max-w-[min(1180px,98vw)]"
          aria-label={expandedImage ? `Expanded image: ${expandedImage.alt}` : "Expanded image"}
        >
          {expandedImage && (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <DialogHeader className="sr-only">
                <DialogTitle>{expandedImage.alt}</DialogTitle>
                <DialogDescription>{expandedImage.caption}</DialogDescription>
              </DialogHeader>
              <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-black/30">
                <img
                  src={expandedImage.src}
                  alt={expandedImage.alt}
                  className="max-h-[84vh] w-auto max-w-full object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{expandedImage.caption}</p>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Close
                  </Button>
                </DialogClose>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-[96vw] border-border bg-card p-4 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>A Complete Introduction to DATAEEL</DialogTitle>
            <DialogDescription>
              Watch the RaceCard walkthrough without leaving this page.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video overflow-hidden rounded-lg border border-border bg-black">
            {videoOpen && (
              <iframe
                title="A Complete Introduction to DATAEEL"
                src={INTRO_VIDEO_EMBED_URL}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default HowToReadRacecard;
