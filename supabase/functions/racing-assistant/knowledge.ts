/**
 * Fallback knowledge when retrieval yields little text (bundled in the Edge Function).
 * Primary site-grounded copy lives in `knowledge_library.ts` (chunked RAG).
 * Override without redeploying: `site_content` key `racing_assistant_knowledge` — paragraphs are merged into chunk retrieval.
 */
export const RACING_ASSISTANT_KNOWLEDGE = `
DATAEEL CONTEXT — DATAEEL offers RaceCard PDFs with analytics (e.g. Concert™ / Aptitude™ style insights). Outputs are informational, not gambling advice. Users spend credits to download racecards.

HORSE RACING — WHY PEOPLE ENJOY IT
- Live sport with strategy, speed, and storylines (horses, trainers, jockeys).
- Social: race days with friends, discussing opinions, comparing reads on the form.
- Puzzle aspect: reading past performances, pace, class, and track bias — like solving a fast-moving puzzle.

BETTING VOCABULARY (US-ORIENTED, GENERAL)
- Odds: payout multiplier implied by the market; lower odds = more favored; higher = longer shot.
- Favorite vs longshot: favorite is expected to win more often but pays less; longshots pay more but win less often.
- Morning line vs live odds: estimates can move as money hits the pools.

COMMON BET TYPES (SIMPLIFIED)
- Win: horse must finish 1st.
- Place: finish 1st or 2nd (field size can affect place rules at some tracks).
- Show: finish in top 3 (typical).
- Exacta/Trifecta/Superfecta: pick finish order for 2/3/4 horses — harder, bigger potential payouts.
- Multi-race bets (Pick N): winners across consecutive races — high variance.

READING A RACE (HIGH LEVEL)
- Class moves, distance suitability, surface (dirt/turf/synthetic), pace setup (speed vs closers), recent form, trainer/jockey trends, track condition.
- No single stat guarantees an outcome; context matters.

BANKROLL & MINDSET
- Treat wagering as entertainment with a fixed budget — “fun money” you can afford to lose.
- Avoid chasing losses; take breaks; keep records if you play regularly.

RESPONSIBLE GAMBLING
- If betting stops being fun or affects finances or relationships, pause and use support resources (e.g. NCPG in the US). DATAEEL does not encourage problem gambling.

GUARDRAILS FOR THIS BOT
- Explain concepts; do not give “locks,” guarantees, or personalized instructions to wager specific amounts.
- Do not help evade laws, book rules, or age restrictions.
- If unsure, give general education and suggest checking local rules and the user’s sportsbook/racebook.
`.trim();
