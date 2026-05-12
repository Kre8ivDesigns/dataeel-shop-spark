export type InsightCategory = "RaceCard Strategy" | "Betting Education" | "Track Notes";

export type InsightArticle = {
  slug: string;
  title: string;
  dek: string;
  category: InsightCategory;
  publishedAt: string;
  readMinutes: number;
  featured?: boolean;
  summary: string;
  sections: {
    heading: string;
    paragraphs: string[];
  }[];
  relatedLinks: {
    label: string;
    href: string;
  }[];
};

export const insightArticles: InsightArticle[] = [
  {
    slug: "how-to-compare-concert-and-aptitude",
    title: "How to compare Concert and Aptitude before a race",
    dek: "A practical way to read agreement, disagreement, and missing-data signals on a DATAEEL RaceCard.",
    category: "RaceCard Strategy",
    publishedAt: "2026-05-12",
    readMinutes: 4,
    featured: true,
    summary:
      "Use both algorithm lists as separate opinions. Agreement can highlight a runner worth deeper review, while disagreement helps you ask sharper questions about the race setup.",
    sections: [
      {
        heading: "Start with overlap",
        paragraphs: [
          "When Concert and Aptitude both place a horse near the top, the runner deserves attention. That does not make the horse a guaranteed outcome, but it does mean two different reads are pointing to the same contender.",
          "Look at the shared top three first, then compare how far apart each horse is across the two columns. A horse ranked first by one model and fourth by the other is a different signal than a horse ranked first and eighth.",
        ],
      },
      {
        heading: "Treat disagreement as context",
        paragraphs: [
          "Concert leans on demonstrated performance. Aptitude is more oriented toward current potential and trajectory. If they disagree, the RaceCard is showing you that the race can be interpreted in more than one reasonable way.",
          "That is useful. It can point you toward a race where pace, class, surface, or limited history may matter more than a single simple ranking.",
        ],
      },
      {
        heading: "Watch the missing-data markers",
        paragraphs: [
          "An x marker means the algorithm did not have enough usable information for that horse. It is not a judgment that the horse cannot run well.",
          "In maiden races or lightly raced fields, missing-data markers are common. Read the available rankings, then keep the uncertainty in mind before making any wagering decision.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Read the RaceCard guide", href: "/how-to-read-racecard" },
      { label: "Browse RaceCards", href: "/racecards" },
    ],
  },
  {
    slug: "first-time-racing-fan-checklist",
    title: "A first-time racing fan checklist",
    dek: "Simple things to know before you follow a card, visit a track, or compare a few runners.",
    category: "Betting Education",
    publishedAt: "2026-05-09",
    readMinutes: 3,
    summary:
      "A race day is easier to enjoy when you know the race number, surface, distance, scratches, and what each bet type is asking you to predict.",
    sections: [
      {
        heading: "Know the race you are reading",
        paragraphs: [
          "Start with the track, date, race number, and post time. Those details keep you from mixing one race with another when several tracks are running at once.",
          "Then check distance and surface. A turf sprint can ask different questions than a dirt route, and a runner's past races may or may not match today's conditions.",
        ],
      },
      {
        heading: "Check scratches before anything else",
        paragraphs: [
          "Scratches change the shape of a race. Cross out scratched horses on the RaceCard and read the remaining runners in order.",
          "A late scratch can also affect pace and odds. If a speed horse comes out, the race may unfold differently than the original card suggested.",
        ],
      },
      {
        heading: "Keep the stakes small",
        paragraphs: [
          "If you wager, decide the amount before the race day starts and treat it as entertainment spending. Favorites lose, long shots win, and no card can remove uncertainty.",
          "The goal is to understand the sport better and keep the experience enjoyable.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Betting basics", href: "/betting-basics" },
      { label: "Disclaimer", href: "/disclaimer" },
    ],
  },
  {
    slug: "why-track-conditions-matter",
    title: "Why track conditions matter",
    dek: "Fast, sloppy, firm, and yielding conditions can change how a race plays and how past form should be interpreted.",
    category: "Track Notes",
    publishedAt: "2026-05-06",
    readMinutes: 3,
    summary:
      "Track condition is one of the first context clues to check because a horse's best past races may have come under very different footing.",
    sections: [
      {
        heading: "Conditions affect confidence",
        paragraphs: [
          "A horse with strong dirt form on a fast track may still be a question mark on a wet surface. The same idea applies to turf runners when the course changes from firm to softer going.",
          "This does not mean you should ignore the horse. It means the past performance needs to be read through today's footing.",
        ],
      },
      {
        heading: "Compare like with like",
        paragraphs: [
          "When possible, compare recent efforts under similar distance, surface, and condition. A close match makes the past race more useful as a reference point.",
          "When there is no close match, acknowledge the unknown. That is often where price, risk tolerance, and personal judgment come into the decision.",
        ],
      },
    ],
    relatedLinks: [
      { label: "Browse today's RaceCards", href: "/racecards" },
      { label: "Contact DATAEEL", href: "/contact" },
    ],
  },
];

export function getFeaturedInsight(articles = insightArticles): InsightArticle {
  return articles.find((article) => article.featured) ?? articles[0];
}

export function getInsightBySlug(slug: string | undefined, articles = insightArticles): InsightArticle | undefined {
  if (!slug) return undefined;
  return articles.find((article) => article.slug === slug);
}

export function getRelatedInsights(currentSlug: string, limit = 2, articles = insightArticles): InsightArticle[] {
  return articles.filter((article) => article.slug !== currentSlug).slice(0, limit);
}
