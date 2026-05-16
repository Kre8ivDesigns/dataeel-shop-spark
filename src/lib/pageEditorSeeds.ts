import heroImageUrl from "@/assets/hero-racing.jpg";

export type PageSeed = {
  slug: string;
  title: string;
  metaDescription: string;
  html: string;
  css: string;
  published: boolean;
};

type ExistingPageSeedState = {
  slug: string;
  html: string | null;
  css: string | null;
};

const sharedCss = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap');
:root {
  --pe-bg: #0b1028;
  --pe-card: #191c2f;
  --pe-card-2: #111933;
  --pe-border: #30364b;
  --pe-text: #f6f8fb;
  --pe-muted: #8991a3;
  --pe-primary: #dfff00;
  --pe-warning: #ffb81c;
  --pe-success: #00d8a4;
  --pe-blue: #1f3f61;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--pe-bg); color: var(--pe-text); font-family: Inter, system-ui, sans-serif; }
.pe-page { min-height: 100vh; background: var(--pe-bg); color: var(--pe-text); }
.pe-shell { width: min(1120px, calc(100% - 32px)); margin: 0 auto; }
.pe-news { display: flex; min-height: 34px; overflow: hidden; border-bottom: 1px solid rgba(223,255,0,.55); background: #050712; font-size: 13px; }
.pe-news strong { display: flex; align-items: center; padding: 0 16px; background: var(--pe-primary); color: var(--pe-bg); font-size: 12px; text-transform: uppercase; letter-spacing: .06em; }
.pe-news span { display: flex; align-items: center; padding: 0 18px; white-space: nowrap; color: rgba(246,248,251,.84); }
.pe-header { position: relative; z-index: 3; border-bottom: 1px solid rgba(255,255,255,.08); background: rgba(11,16,40,.92); backdrop-filter: blur(14px); }
.pe-header-inner { min-height: 96px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.pe-brand { display: flex; align-items: center; gap: 14px; color: var(--pe-text); text-decoration: none; }
.pe-brand img { width: 58px; height: 58px; object-fit: contain; }
.pe-brand-name { font-family: Space Grotesk, sans-serif; font-size: 24px; font-weight: 700; line-height: 1; }
.pe-brand-tag { color: var(--pe-muted); font-size: 12px; margin-top: 5px; }
.pe-nav { display: flex; align-items: center; gap: 20px; font-size: 14px; font-weight: 600; }
.pe-nav a { color: rgba(246,248,251,.82); text-decoration: none; }
.pe-button, .pe-button-secondary { display: inline-flex; align-items: center; justify-content: center; min-height: 48px; padding: 0 24px; border-radius: 8px; font-weight: 800; text-decoration: none; }
.pe-button { background: var(--pe-primary); color: var(--pe-bg); box-shadow: 0 0 24px rgba(223,255,0,.22); }
.pe-button-secondary { border: 2px solid var(--pe-blue); color: var(--pe-text); background: transparent; }
.pe-hero { position: relative; overflow: hidden; min-height: 700px; display: flex; align-items: center; text-align: center; }
.pe-hero:before { content: ""; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(11,16,40,.94), rgba(28,58,91,.84)), var(--pe-hero-image); background-size: cover; background-position: center; }
.pe-hero .pe-shell { position: relative; z-index: 1; padding: 84px 0 72px; }
.pe-pill { display: inline-flex; align-items: center; gap: 8px; max-width: 100%; margin-bottom: 24px; padding: 10px 16px; border: 1px solid rgba(223,255,0,.3); border-radius: 999px; background: rgba(25,28,47,.75); color: rgba(246,248,251,.84); font-size: 14px; box-shadow: 0 0 28px rgba(223,255,0,.12); }
.pe-pill strong { color: var(--pe-text); }
.pe-title { margin: 0 auto 22px; max-width: 920px; font-family: Space Grotesk, sans-serif; font-size: clamp(44px, 7vw, 82px); line-height: .98; letter-spacing: 0; font-weight: 800; }
.pe-subtitle { max-width: 720px; margin: 0 auto 14px; color: rgba(246,248,251,.72); font-size: clamp(18px, 2vw, 22px); line-height: 1.55; }
.pe-tagline { margin: 0 0 32px; color: var(--pe-muted); font-style: italic; }
.pe-actions { display: flex; justify-content: center; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
.pe-badges { display: flex; justify-content: center; flex-wrap: wrap; gap: 14px; }
.pe-badge { padding: 9px 14px; border-radius: 999px; background: rgba(48,54,75,.62); color: rgba(246,248,251,.82); font-size: 14px; }
.pe-section { padding: 96px 0; position: relative; overflow: hidden; }
.pe-section-title { margin: 0 auto 16px; max-width: 760px; text-align: center; font-family: Space Grotesk, sans-serif; font-size: clamp(36px, 5vw, 56px); line-height: 1.05; font-weight: 800; }
.pe-neon { color: var(--pe-primary); }
.pe-section-subtitle { max-width: 720px; margin: 0 auto 58px; color: var(--pe-muted); text-align: center; font-size: 19px; line-height: 1.6; }
.pe-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 24px; }
.pe-grid-4 { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 24px; }
.pe-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 36px; align-items: center; }
.pe-card { border: 1px solid var(--pe-border); border-radius: 12px; background: var(--pe-card); padding: 28px; }
.pe-card h3 { margin: 0 0 10px; font-family: Space Grotesk, sans-serif; font-size: 22px; }
.pe-card p, .pe-copy p { color: var(--pe-muted); line-height: 1.65; }
.pe-stat { text-align: center; }
.pe-stat strong { display: block; color: var(--pe-primary); font-family: JetBrains Mono, monospace; font-size: 42px; }
.pe-price { display: flex; flex-direction: column; min-height: 100%; text-align: center; }
.pe-price .amount { margin: 18px 0 4px; font-family: JetBrains Mono, monospace; font-size: 54px; font-weight: 800; }
.pe-list { display: grid; gap: 12px; padding: 0; margin: 24px 0 0; list-style: none; text-align: left; }
.pe-list li { color: rgba(246,248,251,.84); }
.pe-list li:before { content: "✓"; margin-right: 10px; color: var(--pe-primary); font-weight: 900; }
.pe-kicker { display: inline-flex; margin-bottom: 16px; padding: 6px 12px; border-radius: 999px; background: var(--pe-primary); color: var(--pe-bg); font-size: 13px; font-weight: 800; }
.pe-copy h1, .pe-copy h2 { margin: 0 0 22px; font-family: Space Grotesk, sans-serif; font-size: clamp(38px, 5vw, 58px); line-height: 1.08; }
.pe-quote { margin: 24px 0; padding-left: 18px; border-left: 2px solid var(--pe-primary); color: rgba(246,248,251,.82); font-size: 20px; font-style: italic; }
.pe-cta { background: linear-gradient(135deg, #0b1028, #19385e); text-align: center; }
.pe-cta p { max-width: 720px; margin: 0 auto 34px; color: rgba(246,248,251,.66); font-size: 19px; line-height: 1.65; }
.pe-footer { padding: 54px 0; border-top: 1px solid var(--pe-border); background: #080d20; color: var(--pe-muted); }
.pe-footer-grid { display: grid; grid-template-columns: minmax(0,1.4fr) repeat(3, minmax(0,1fr)); gap: 28px; }
.pe-footer h4 { margin: 0 0 12px; color: var(--pe-text); font-family: Space Grotesk, sans-serif; }
.pe-footer a { display: block; margin: 8px 0; color: var(--pe-muted); text-decoration: none; }
@media (max-width: 900px) {
  .pe-header-inner, .pe-grid-2 { grid-template-columns: 1fr; flex-direction: column; align-items: flex-start; }
  .pe-nav { flex-wrap: wrap; gap: 12px; }
  .pe-grid-3, .pe-grid-4, .pe-footer-grid { grid-template-columns: 1fr; }
  .pe-hero { min-height: 620px; }
}
`;

const pageShell = (content: string, includeNews = false) => `
<div class="pe-page" style="--pe-hero-image: url('${heroImageUrl}')">
  ${includeNews ? `<div class="pe-news"><strong>Breaking News</strong><span>Concert algorithm picks Winner in race #1, #2, #3, #6, #7; Belmont At Big A May 1, 2026</span><span>Aptitude algorithm hits TRIFECTA in race #8; Laurel Park May 1, 2026</span></div>` : ""}
  <header class="pe-header">
    <div class="pe-shell pe-header-inner">
      <a class="pe-brand" href="/">
        <img src="/dataeel-logo.png" alt="DATAEEL" />
        <span><span class="pe-brand-name">DATAEEL</span><span class="pe-brand-tag">Horse Racing Simplified</span></span>
      </a>
      <nav class="pe-nav">
        <a href="/racecards">RaceCards</a><a href="/pricing">Pricing</a><a href="/how-to-read-racecard">How it works</a><a href="/contact">Contact</a>
      </nav>
    </div>
  </header>
  ${content}
  <footer class="pe-footer">
    <div class="pe-shell pe-footer-grid">
      <div><h4>DATAEEL</h4><p>Algorithm-powered RaceCards for thoroughbred racing.</p></div>
      <div><h4>Product</h4><a href="/racecards">RaceCards</a><a href="/pricing">Pricing</a></div>
      <div><h4>Learn</h4><a href="/betting-basics">Betting Basics</a><a href="/how-to-read-racecard">How to Read a RaceCard</a></div>
      <div><h4>Company</h4><a href="/contact">Contact</a><a href="/privacy-policy">Privacy</a></div>
    </div>
  </footer>
</div>`;

const homeHtml = pageShell(`
  <section class="pe-hero">
    <div class="pe-shell">
      <div class="pe-pill"><strong>Recent results snapshot:</strong> 18 winner calls / 22 exotics posted</div>
      <h1 class="pe-title">Stop Guessing. Start Reading the Race Smarter.</h1>
      <p class="pe-subtitle">Algorithm-powered RaceCards for 28+ tracks. See the Concert&trade; and Aptitude&trade; picks in a simple PDF before you spend hours buried in past performances.</p>
      <p class="pe-tagline">Horse Racing Simplified&reg;</p>
      <div class="pe-actions"><a class="pe-button" href="/how-to-read-racecard">View Sample RaceCard</a><a class="pe-button-secondary" href="/racecards">Today Races</a></div>
      <div class="pe-badges"><span class="pe-badge">Concert&trade; & Aptitude&trade;</span><span class="pe-badge">28+ Racetracks</span><span class="pe-badge">Credits never expire</span></div>
    </div>
  </section>
  <section class="pe-section">
    <div class="pe-shell">
      <h2 class="pe-section-title">Credit Packages for <span class="pe-neon">Every Bettor</span></h2>
      <p class="pe-section-subtitle">Buy credits, use them anytime. One credit = one full day of predictions for any track.</p>
      <div class="pe-grid-4">
        <article class="pe-card pe-price"><h3>Starter</h3><p>Try one RaceCard</p><div class="amount">$5</div><p>1 credit</p><ul class="pe-list"><li>One RaceCard download</li><li>Concert and Aptitude picks</li><li>Credits never expire</li></ul></article>
        <article class="pe-card pe-price"><h3>Weekend</h3><p>For a full race weekend</p><div class="amount">$20</div><p>5 credits</p><ul class="pe-list"><li>5 RaceCard downloads</li><li>Track-by-track PDFs</li><li>Instant account access</li></ul></article>
        <article class="pe-card pe-price"><h3>Player</h3><p>Best for regular bettors</p><div class="amount">$35</div><p>10 credits</p><ul class="pe-list"><li>10 RaceCard downloads</li><li>Simple PDF format</li><li>Use credits anytime</li></ul></article>
        <article class="pe-card pe-price"><h3>Unlimited</h3><p>Maximum RaceCard access</p><div class="amount">$99</div><p>Unlimited PDFs</p><ul class="pe-list"><li>Unlimited RaceCard PDFs</li><li>One-time purchase</li><li>Best active-player value</li></ul></article>
      </div>
    </div>
  </section>
  <section class="pe-section">
    <div class="pe-shell pe-grid-2">
      <div class="pe-copy"><span class="pe-kicker">About DATAEEL</span><h2>Data-Driven Racing. <span class="pe-neon">Winning Results.</span></h2><div class="pe-quote">How about a simplified and honest approach to Horse Racing?</div><p>DATAEEL provides horse racing predictions powered by two proprietary algorithms, Concert and Aptitude, built for everyday bettors who want clear RaceCard guidance without complicated handicapping.</p></div>
      <div class="pe-grid-2"><div class="pe-card pe-stat"><strong>97+</strong><span>Years Combined Experience</span></div><div class="pe-card pe-stat"><strong>28+</strong><span>Racetracks Covered</span></div><div class="pe-card pe-stat"><strong>2</strong><span>Proprietary Algorithms</span></div><div class="pe-card pe-stat"><strong>1000s</strong><span>Winners Predicted</span></div></div>
    </div>
  </section>
  <section class="pe-section pe-cta"><div class="pe-shell"><h2 class="pe-section-title">Ready to Make <span class="pe-neon">Smarter Bets?</span></h2><p>Join bettors who have moved from guesswork to clear algorithmic RaceCards. Get your first RaceCard today.</p><div class="pe-actions"><a class="pe-button" href="/racecards">Get Today's Cards</a><a class="pe-button-secondary" href="/pricing">View Pricing</a></div></div></section>
`, true);

const pricingHtml = pageShell(`
  <section class="pe-section">
    <div class="pe-shell">
      <h1 class="pe-section-title">Credit Packages for <span class="pe-neon">Every Bettor</span></h1>
      <p class="pe-section-subtitle">Buy credits, use them anytime. One credit = one full day of predictions for any track.</p>
      <div class="pe-grid-4">
        <article class="pe-card pe-price"><h3>Starter</h3><p>Try one RaceCard</p><div class="amount">$5</div><p>1 credit</p><a class="pe-button" href="/buy-credits">Choose Starter</a></article>
        <article class="pe-card pe-price"><h3>Weekend</h3><p>For a full race weekend</p><div class="amount">$20</div><p>5 credits</p><a class="pe-button" href="/buy-credits">Choose Weekend</a></article>
        <article class="pe-card pe-price"><h3>Player</h3><p>Best for regular bettors</p><div class="amount">$35</div><p>10 credits</p><a class="pe-button" href="/buy-credits">Choose Player</a></article>
        <article class="pe-card pe-price"><h3>Unlimited</h3><p>Maximum RaceCard access</p><div class="amount">$99</div><p>Unlimited PDFs</p><a class="pe-button" href="/buy-credits">Get unlimited access</a></article>
      </div>
    </div>
  </section>
`);

const contactHtml = pageShell(`
  <section class="pe-section">
    <div class="pe-shell pe-grid-2">
      <div class="pe-copy"><span class="pe-kicker">Contact</span><h1>Questions about RaceCards or your account?</h1><p>Reach DATAEEL support for purchase help, RaceCard questions, and account assistance.</p></div>
      <div class="pe-card"><h3>Send a message</h3><p>Name</p><p>Email</p><p>Message</p><a class="pe-button" href="/contact">Open contact form</a></div>
    </div>
  </section>
`);

const learnHtml = (title: string, subtitle: string) => pageShell(`
  <section class="pe-section">
    <div class="pe-shell">
      <h1 class="pe-section-title">${title}</h1>
      <p class="pe-section-subtitle">${subtitle}</p>
      <div class="pe-grid-3">
        <article class="pe-card"><h3>Start with the track</h3><p>Pick the racetrack and date you are playing before comparing signals.</p></article>
        <article class="pe-card"><h3>Read the algorithms</h3><p>Concert and Aptitude give you simplified perspectives on likely contenders.</p></article>
        <article class="pe-card"><h3>Use it as guidance</h3><p>RaceCards simplify the work; final betting decisions remain yours.</p></article>
      </div>
    </div>
  </section>
`);

const legalHtml = (title: string, body: string) => pageShell(`
  <section class="pe-section">
    <div class="pe-shell">
      <h1 class="pe-section-title">${title}</h1>
      <div class="pe-card"><p>${body}</p><p>Edit this page copy in the Page Editor while keeping the current DATAEEL visual system.</p></div>
    </div>
  </section>
`);

export const FRONTEND_PAGE_SEEDS: PageSeed[] = [
  { slug: "home", title: "Home", metaDescription: "DATAEEL algorithm-powered RaceCards for thoroughbred racing.", html: homeHtml, css: sharedCss, published: true },
  { slug: "pricing", title: "Pricing", metaDescription: "DATAEEL credit packages and RaceCard pricing.", html: pricingHtml, css: sharedCss, published: true },
  { slug: "contact", title: "Contact", metaDescription: "Contact DATAEEL support.", html: contactHtml, css: sharedCss, published: true },
  { slug: "betting-basics", title: "Betting Basics", metaDescription: "Learn basic horse racing betting concepts.", html: learnHtml("Betting Basics", "A plain-language introduction to betting concepts before you read a RaceCard."), css: sharedCss, published: true },
  { slug: "how-to-read-racecard", title: "How to Read a RaceCard", metaDescription: "Learn how to read DATAEEL RaceCards.", html: learnHtml("How to Read a RaceCard", "Understand the DATAEEL format, algorithm labels, and how to compare picks."), css: sharedCss, published: true },
  { slug: "terms", title: "Terms of Service", metaDescription: "DATAEEL terms of service.", html: legalHtml("Terms of Service", "These terms govern your use of DATAEEL services and RaceCard content."), css: sharedCss, published: true },
  { slug: "privacy", title: "Privacy Policy", metaDescription: "DATAEEL privacy policy.", html: legalHtml("Privacy Policy", "This page explains how DATAEEL collects, uses, and protects information."), css: sharedCss, published: true },
  { slug: "disclaimer", title: "Disclaimer", metaDescription: "DATAEEL racing content disclaimer.", html: legalHtml("Disclaimer", "RaceCard predictions are informational only and do not guarantee betting outcomes."), css: sharedCss, published: true },
];

const legacyPlaceholderSnippets = [
  "Welcome to DATAEEL",
  "Tell your story here",
  "Choose a plan that works for you",
  "Please read these terms carefully",
  "How we collect, use, and protect your data",
];

export function normalizePageSlug(value: string | null | undefined): string {
  const cleaned = String(value ?? "home").trim().toLowerCase().replace(/^\/+|\/+$/g, "");
  if (!cleaned || cleaned === "homepage") return cleaned || "home";
  if (cleaned === "privacy-policy") return "privacy";
  return cleaned;
}

export function getFrontendPageSeed(slug: string | null | undefined): PageSeed | undefined {
  const normalized = normalizePageSlug(slug);
  const lookupSlug = normalized === "homepage" ? "home" : normalized;
  return FRONTEND_PAGE_SEEDS.find((seed) => seed.slug === lookupSlug);
}

export function pathForPageSlug(slug: string): string {
  const normalized = normalizePageSlug(slug);
  if (normalized === "home" || normalized === "homepage") return "/";
  if (normalized === "privacy") return "/privacy-policy";
  return `/${normalized}`;
}

export function isSeedablePageContent(page: ExistingPageSeedState): boolean {
  const html = page.html?.trim() ?? "";
  const css = page.css?.trim() ?? "";
  if (!html && !css) return true;
  return legacyPlaceholderSnippets.some((snippet) => html.includes(snippet));
}

export function buildFrontendSeedUpserts(existingPages: ExistingPageSeedState[]) {
  const existingBySlug = new Map(existingPages.map((page) => [normalizePageSlug(page.slug), page]));
  return FRONTEND_PAGE_SEEDS.filter((seed) => {
    const existing = existingBySlug.get(seed.slug);
    return !existing || isSeedablePageContent(existing);
  }).map((seed) => ({
    slug: seed.slug,
    title: seed.title,
    html: seed.html,
    css: seed.css,
    published: seed.published,
    meta_description: seed.metaDescription,
    updated_at: new Date().toISOString(),
  }));
}
