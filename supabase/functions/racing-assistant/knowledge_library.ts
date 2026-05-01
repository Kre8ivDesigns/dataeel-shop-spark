/**
 * Structured knowledge distilled from thedataeel.com + dataeel.com (marketing/education copy).
 * Retrieved via keyword scoring in ../_shared/racing_rag.ts to trim prompt tokens.
 */
import type { KnowledgeChunk } from "../_shared/racing_rag.ts";

/** Always appended last (small) — bot guardrails + responsible framing. */
export const GUARD_CHUNK: KnowledgeChunk = {
  id: "guardrails",
  keywords: ["legal", "advice", "bet", "gambling", "guarantee", "lock", "pick"],
  body: `BOT RULES (always apply): Explain racing/betting concepts only; no picks, locks, guarantees, or stake sizing. Outputs are informational, not gambling advice. Encourage responsible play and compliance with local laws and operator rules. If asked for legal/medical/tax advice, decline and suggest a professional. DATAEEL RaceCards use Equibase-style data; RSS/news sections on the site syndicate third-party feeds for convenience — DATAEEL is not affiliated with those publishers.`,
};

export const KNOWLEDGE_CHUNKS: KnowledgeChunk[] = [
  {
    id: "brand_product",
    keywords: ["dataeel", "eel", "racecard", "racecards", "what is", "service", "download"],
    body: `DATAEEL® / theDATAEEL™ offers algorithm-powered EEL RaceCards as PDF downloads for thoroughbred racing — Horse Racing Simplified®. Two proprietary algorithms appear on the cards: Concert™ (emphasizes live performance under race-day pressure) and Aptitude™ (emphasizes inherent ability, pace, stamina, and potential). Registration is free; users purchase credits to download cards for specific tracks and dates. No extra software is required beyond a PDF viewer.`,
  },
  {
    id: "credits_pricing",
    keywords: ["credit", "credits", "price", "pricing", "cost", "pay", "buy", "dollar", "package"],
    body: `Credits: one credit typically equals one full calendar day of EEL RaceCard predictions for any covered track (same day’s card). Credit packages are sold in tiers on the marketing site (examples have included starter, “best value,” pro, and larger bundles); per-card economics improve with larger packs. Credits are marketed as not expiring — use them when you choose. Prices on the public site can change; users purchase signed-in via the dashboard buy-credits flow.`,
  },
  {
    id: "tracks_coverage",
    keywords: ["track", "tracks", "churchill", "santa", "gulfstream", "woodbine", "canada", "usa"],
    body: `Coverage: DATAEEL markets predictions for many major U.S. and Canadian thoroughbred venues — often described as 28+ racetracks (marketing figure). Schedule/coverage can vary by date; the RaceCards catalog shows which tracks have published cards for the date you pick.`,
  },
  {
    id: "how_it_works",
    keywords: ["how", "works", "steps", "start", "begin", "sign up", "register"],
    body: `Typical flow: (1) Register free for an account. (2) Pick a track/date from the RaceCards experience. (3) Buy credits from the dashboard when you want downloads — one credit unlocks that day’s card for that track. (4) Download the PDF RaceCard and use Concert™ / Aptitude™ highlights as part of your handicapping education.`,
  },
  {
    id: "algorithms_detail",
    keywords: ["concert", "aptitude", "algorithm", "models", "method"],
    body: `Concert™ focuses on how horses perform under race-day conditions — energy distribution, trips, and finishing patterns in live competition. Aptitude™ focuses more on fundamental ability and suitability — distance, surface, pace matchup, and upside. Both are informational overlays on structured race data (Equibase is cited as the commercial data backbone). Past marketing highlights real-world hits (e.g., winners, Pick 3s, doubles, trifectas) as illustrations — not guarantees for future races.`,
  },
  {
    id: "data_sources",
    keywords: ["equibase", "data", "accuracy", "rss", "abr", "tdn", "news"],
    body: `Race data is framed around Equibase® as the official North American stats backbone for many handicapping products. The marketing site also embeds syndicated headlines (e.g., America’s Best Racing “The Sport,” Thoroughbred Daily News RSS, Equibase late-changes-style feeds). Those feeds are informational conveniences; always verify scratches, odds, and conditions with the track/sportsbook before wagering.`,
  },
  {
    id: "legacy_dataeel_com",
    keywords: ["dataeel.com", "five", "$5", "simple", "landing"],
    body: `The legacy dataeel.com landing page emphasizes simplicity: thoroughbred algorithms, no software install, low-friction entry — historical taglines mentioned an approachable price point for a day’s worth of predictions. Pricing and packaging evolve; signed-in credit packages on theDATAEEL.com / dashboard are authoritative for purchase.`,
  },
  {
    id: "social_proof",
    keywords: ["testimonial", "reviews", "customers", "win rate", "percent"],
    body: `Marketing pages cite community testimonials and high-level performance narratives (e.g., illustrative strike-rate-style figures on landing pages). Treat these as promotional storytelling, not predictive guarantees for any future race.`,
  },
  {
    id: "betting_vocab",
    keywords: ["exacta", "trifecta", "pick", "double", "quinella", "superfecta", "bet type"],
    body: `Common North American bets referenced on-site include win/place/show, vertical exotics (exacta, trifecta, superfecta), and multi-race horizontal bets (daily double, Pick 3 sequences). Rules/payout structures can vary by jurisdiction and pool type — users should confirm locally.`,
  },
  {
    id: "education_handicapping",
    keywords: ["handicap", "handicapping", "pace", "class", "form", "speed"],
    body: `Educational framing: handicappers weigh class moves, distance/surface fit, pace scenarios, trainer/jockey trends, and track bias. RaceCards aim to compress complex signals into approachable visuals — still subject to racing variance.`,
  },
  {
    id: "responsible_gambling",
    keywords: ["responsible", "problem", "addiction", "help", "ncpg", "budget"],
    body: `Responsible play: set an entertainment budget, avoid chasing losses, and pause if betting stops feeling fun. If gambling causes harm, seek confidential help (in the U.S., the National Council on Problem Gambling offers resources). DATAEEL services are for adults where legally permitted.`,
  },
];
