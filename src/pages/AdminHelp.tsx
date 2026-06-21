import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link, useParams } from "react-router-dom";
import {
  BarChart3,
  Book,
  Bot,
  Compass,
  CreditCard,
  Database,
  FileText,
  HelpCircle,
  Inbox,
  Settings,
  ShieldCheck,
  Table2,
  Users,
} from "lucide-react";

type GuideCard = {
  title: string;
  description: string;
  items: string[];
};

type Workflow = {
  title: string;
  steps: string[];
};

type HelpTopic = {
  slug: string;
  title: string;
  summary: string;
  icon: typeof Users;
  sections: {
    title: string;
    body?: string;
    bullets: string[];
  }[];
};

const overviewCards: GuideCard[] = [
  {
    title: "What DATAEEL does",
    description: "DATAEEL sells downloadable RaceCard PDFs for horse racing research.",
    items: [
      "Visitors browse RaceCards by track and date, create an account, buy credits, then spend credits to download PDFs.",
      "The product presents race information and educational content as informational research, not gambling advice.",
      "The site includes public marketing pages, a customer dashboard, credit checkout, invoices, RaceCard browsing, and admin tools.",
    ],
  },
  {
    title: "How money and credits move",
    description: "Stripe handles payment; Supabase records the app-side credit balance and transaction history.",
    items: [
      "Credit packages are configured in Admin -> Credit packages and displayed on pricing and checkout surfaces.",
      "Checkout starts from Buy Credits and calls the create-checkout-session Edge Function.",
      "Successful payments are reconciled through Stripe webhooks and post-payment confirmation logic before credits appear.",
    ],
  },
  {
    title: "What admins operate",
    description: "The admin area is the control room for customers, RaceCards, settings, analytics, support, and reports.",
    items: [
      "Use Admin Dashboard for customer search, credit adjustments, RaceCard uploads, transaction review, and user management.",
      "Use Settings for AI providers, SMTP, broadcast email, CAPTCHA, Stripe, analytics IDs, racetrack profiles, and ticker content.",
      "Use Analytics, Financial dashboard, Reports, Support inbox, invoices, and billing portal flows for daily operational visibility.",
    ],
  },
];

const adminSections: GuideCard[] = [
  {
    title: "Dashboard",
    description: "Main admin landing page for customers, purchases, RaceCards, and operations.",
    items: [
      "Review top-line counts for customers, purchases, RaceCards, and revenue.",
      "Search customers by name or email, open details, give credits, create users, delete users, or remove fake zero-credit users.",
      "Open a customer detail sheet for profile edits, password recovery, ban or unban actions, unlimited-credit toggles, purchases, and downloads.",
      "Review transactions and uploaded RaceCards from the tabs below the stats cards.",
    ],
  },
  {
    title: "RaceCard operations",
    description: "Admin tools for publishing and maintaining RaceCard PDF inventory.",
    items: [
      "Upload PDFs from the Dashboard RaceCards tab; the app generates an upload URL, stores the file, parses metadata, and inserts the RaceCard row.",
      "File names are sanitized on upload, and uploading a card for a track/date that already exists replaces the previous file and row.",
      "Use S3 sync when PDFs already exist in storage and need to be reflected in Supabase.",
      "Review digitization status, metadata JSON, track/date fields, and public availability before expecting cards to appear correctly on /racecards.",
      "Public RaceCard detail pages show locked previews first, then unlock picks, predictions, and results for admins or purchasers when data exists.",
    ],
  },
  {
    title: "Support inbox",
    description: "Contact form submissions from the public site.",
    items: [
      "Open new messages, change status to open, in progress, or closed, and keep internal notes.",
      "Newest submissions appear first so unresolved customer issues can be handled quickly.",
      "If no rows load, confirm the contact_submissions table and admin RLS access are available in Supabase.",
    ],
  },
  {
    title: "Reports",
    description: "Operational reporting for downloads, track demand, and credit movement.",
    items: [
      "Every RaceCard download is logged with the customer and a timestamp, including repeat downloads.",
      "Use By user to see who downloaded what, By racecard for per-PDF totals, and By track for track demand.",
      "Use Credit ledger to audit credit grants, purchases, downloads, and balance changes.",
      "Export the full download log or the credit ledger to CSV for finance or support follow-up.",
    ],
  },
  {
    title: "Financial dashboard",
    description: "Revenue and transaction analysis for the Stripe-backed credit business.",
    items: [
      "Review revenue, purchase volume, and package-level performance.",
      "Use CSV export when reconciling external records or sharing finance snapshots.",
      "If figures look incomplete, check Stripe mode, webhook delivery, and transaction rows before changing chart code.",
    ],
  },
  {
    title: "Site analytics",
    description: "First-party traffic, source, and purchase-funnel analytics, plus paid-ads performance.",
    items: [
      "Pick a date range (including Last 7 days) to focus visitors, sources, signup/RaceCards/purchase funnels, the CTA click map, and UTM coverage.",
      "Use the AI funnel analyst for a plain-English read of the current funnel with specific suggestions, and Print report for a share-ready snapshot.",
      "Connect Facebook (Meta) Ads to see spend, reach, conversions, and cost per signup beside the first-party funnel; until connected the panel shows 'not connected'.",
      "Facebook Ads uses Meta Marketing API credentials set as server secrets (META_ACCESS_TOKEN, META_AD_ACCOUNT_ID) — there is no key to paste in the browser.",
      "If analytics are unavailable, apply the site_analytics_events and fb_ads_insights migrations to the active Supabase database.",
    ],
  },
  {
    title: "Settings",
    description: "Configuration for integrations and live site behavior.",
    items: [
      "AI providers controls the DATAEEL assistant provider, model, keys, and cost cap.",
      "SMTP and Broadcast email handle admin-controlled outbound messaging to confirmed users; SMTP settings are encrypted at rest.",
      "Stripe settings include test/live mode, key prefix validation, and webhook URL guidance, but production Edge Functions still need Supabase secrets.",
      "CAPTCHA, Analytics & site, Racetracks, and Breaking news ticker keep the public app and Edge Functions aligned.",
    ],
  },
  {
    title: "Credit packages",
    description: "Admin pricing table for what customers can buy.",
    items: [
      "Create and edit packages with name, price, credit count, description, active state, sort order, and unlimited-credit option.",
      "Customer purchases call create-checkout-session and redirect to Stripe; invoices and billing management call customer-portal.",
      "Keep package names aligned with the customer-facing display metadata where possible.",
      "Deactivate packages instead of deleting them when past transactions still reference the package.",
    ],
  },
];

const workflows: Workflow[] = [
  {
    title: "Handle a customer who says credits are missing",
    steps: [
      "Open Admin Dashboard and search the customer email.",
      "Check current credits, unlimited status, transactions, and ledger history.",
      "If Stripe redirected but credits are missing, ask for the Stripe receipt or session id and check webhook or reconciliation status.",
      "Use Give Credits only after confirming the purchase or making an intentional customer-service adjustment.",
    ],
  },
  {
    title: "Update RaceCard availability",
    steps: [
      "Open Admin Dashboard and use the RaceCards tab for uploaded PDF records.",
      "Upload the PDF or run S3 sync, then confirm track name, track code, race date, file name, metadata, and public availability.",
      "Check digitization status if predictions, selections, or official results should appear on the digital detail page.",
      "After upload or edits, check /racecards for the relevant date and verify the card can be opened by a signed-in admin or purchaser.",
    ],
  },
  {
    title: "Change pricing",
    steps: [
      "Open Admin -> Credit packages.",
      "Edit package credits, price, active state, description, and sort order.",
      "Check Pricing and Buy Credits so the customer-facing package list matches the intended offer.",
      "Run a Stripe test-mode checkout before switching major pricing changes live.",
    ],
  },
  {
    title: "Configure payments",
    steps: [
      "Open Admin -> Settings -> Stripe and choose Test or Live mode.",
      "Add matching publishable keys, secret keys, and webhook signing secrets for the selected Stripe environment.",
      "Register the displayed Supabase webhook URL in Stripe for both test and live webhook endpoints.",
      "Verify create-checkout-session, stripe-webhook, customer-portal, and invoice views against the same Supabase project.",
    ],
  },
  {
    title: "Review why visitors are not buying",
    steps: [
      "Open Admin -> Site analytics and choose a useful date range.",
      "Compare visitors, bounce rate, pricing-to-buy rate, checkout-start rate, top sources, and exit pages.",
      "Read the AI analysis cards for plain-English funnel issues.",
      "Prioritize fixes where high-traffic sources or pricing visitors fail to reach checkout.",
    ],
  },
  {
    title: "Connect Facebook (Meta) Ads",
    steps: [
      "Have your technical contact set META_ACCESS_TOKEN (a long-lived token with ads_read) and META_AD_ACCOUNT_ID (e.g. act_1234567890) as Supabase secrets.",
      "Open Admin -> Site analytics and pick a date range; the Facebook Ads panel fills in automatically once credentials are present.",
      "Tag ad links with UTM parameters so cost-per-signup attributes spend to the right source.",
      "Treat the Meta token like a key: never paste it into pages, email, or screenshots, and rotate it if exposed.",
    ],
  },
  {
    title: "Respond to support",
    steps: [
      "Open Admin -> Support inbox.",
      "Set the message to in progress while you investigate.",
      "Add admin notes with what you checked and the customer-facing response status.",
      "Close the submission only after the customer issue is resolved or no further action is needed.",
    ],
  },
];

const operationsChecklist = [
  "Confirm the active Supabase project matches the deployed Vite environment before diagnosing Edge Function issues.",
  "Do not paste secrets into source code or commit .env files; use Supabase secrets and encrypted Admin Settings fields.",
  "Run test-mode Stripe checkout after payment configuration changes.",
  "Verify invoices and billing management against the customer-portal Edge Function after Stripe changes.",
  "Check audit log errors after settings, webhook, admin user, or payment changes.",
  "Keep RaceCard dates, track codes, file names, metadata, and S3 objects consistent so browse filters and download records stay readable.",
  "Apply required Supabase migrations when admin pages report missing tables.",
];

type RouteRef = {
  screen: string;
  path: string;
  summary: string;
};

const consoleMap: RouteRef[] = [
  { screen: "Dashboard", path: "/admin", summary: "Home base: top-line stats plus searchable tables of customers, RaceCards, and transactions." },
  { screen: "Settings", path: "/admin/settings", summary: "API keys, SMTP, broadcast email, breaking-news ticker, AI assistant, racetrack profiles, and webhooks." },
  { screen: "Credit packages", path: "/admin/credit-packages", summary: "Create, edit, price, and retire the credit bundles customers buy." },
  { screen: "Financial dashboard", path: "/admin/financials", summary: "Revenue charts, transaction analysis, subscription cancellations, and trends over time." },
  { screen: "Site analytics", path: "/admin/analytics", summary: "Visitors, sources, funnels, CTA map, UTM coverage, AI analyst, Facebook Ads, and a print report." },
  { screen: "Reports", path: "/admin/reports", summary: "RaceCard downloads by user, racecard, and track, plus the credit ledger — all exportable to CSV." },
  { screen: "Support inbox", path: "/admin/support", summary: "Contact-form submissions and support requests from customers." },
  { screen: "Pages", path: "/admin/pages", summary: "List of editable site pages; publish or unpublish, and open the editor." },
  { screen: "Page editor", path: "/admin/page-editor", summary: "Drag-and-drop visual editor for page content (GrapesJS)." },
  { screen: "SEO tools", path: "/admin/seo", summary: "Audit pages, research keywords, and generate meta descriptions." },
  { screen: "Help center", path: "/admin/help", summary: "This guide — how the platform works and how to run it." },
];

type SystemRef = {
  subject: string;
  system: string;
  note: string;
};

const systemsMap: SystemRef[] = [
  { subject: "Customer logins & profiles", system: "Supabase (Auth)", note: "The admin role is set here. Passwords and 2FA are managed by Supabase Auth." },
  { subject: "Credit balances & ledger", system: "Supabase (Database)", note: "Surfaced in Reports. Updated automatically after purchases." },
  { subject: "Payments, invoices, subscriptions", system: "Stripe", note: "Checkout, subscription billing, and invoices are Stripe. The site reflects what Stripe reports." },
  { subject: "RaceCard PDF files", system: "AWS S3", note: "Customers receive temporary, expiring download links; files are never public." },
  { subject: "RaceCard catalog entries", system: "Supabase (Database)", note: "The list customers browse — populated by syncing the S3 bucket." },
  { subject: "Settings & secrets", system: "Supabase (encrypted)", note: "SMTP, API keys, and Stripe secrets are stored encrypted and edited in Settings." },
  { subject: "Editable page content", system: "Supabase (Database)", note: "Created in the Page editor; unpublished pages fall back to built-in versions." },
  { subject: "Email sending", system: "SMTP (your provider)", note: "Configured in Settings -> SMTP. Powers alerts and broadcasts." },
  { subject: "Facebook Ads metrics", system: "Meta Marketing API", note: "Pulled via server secrets and cached for the analytics page." },
];

type GlossaryTerm = {
  term: string;
  definition: string;
};

const glossary: GlossaryTerm[] = [
  { term: "RaceCard", definition: "A digitized horse-racing prediction sheet (a PDF) that customers unlock and download." },
  { term: "Credit", definition: "The in-site currency. Customers buy credits and spend them to unlock RaceCards." },
  { term: "Credit package", definition: "A purchasable bundle of credits at a set price, linked to a Stripe price." },
  { term: "Unlimited credits", definition: "An account flag that unlocks cards without spending credits — for staff or comps." },
  { term: "Admin role", definition: "The permission that unlocks the /admin console. Set in the database, not from a screen." },
  { term: "Edge Function", definition: "A small Supabase server program that runs tasks like checkout, email, and feeds." },
  { term: "Conversion funnel", definition: "A step-by-step count (visit -> signup -> purchase) showing where people drop off." },
  { term: "CTA", definition: "Call to action — a button or link you want visitors to click. The CTA map counts these." },
  { term: "UTM", definition: "Tags added to a link (e.g. on an ad) so analytics can tell which campaign sent a visitor." },
  { term: "AI funnel analyst", definition: "An on-demand AI summary that reads your funnel numbers and suggests what to fix." },
  { term: "Download log", definition: "The record of every RaceCard download, by customer and time — the basis of the Reports tabs." },
  { term: "Download window", definition: "The period a RaceCard can be downloaded — until midnight on race day, in the track's time zone." },
];

const dependencyNotes = [
  "site_analytics_events is required for first-party analytics.",
  "audit_log is required for the Analytics audit and error panels.",
  "breaking_news_items, racecard_predictions, and racetrack_profiles migrations support ticker, digitized RaceCards, and track profile features.",
  "manage-app-settings backs encrypted admin settings.",
  "create-checkout-session, stripe-webhook, customer-portal, download-racecard, racing-assistant, ai-admin, upload, sync, and email functions must be deployed for the related features.",
  "Stripe Dashboard webhook endpoints must point to the Supabase stripe-webhook URL shown in Admin Settings.",
  "The DATAEEL assistant requires a configured provider key or a usable environment secret.",
];

const helpTopics: HelpTopic[] = [
  {
    slug: "customers",
    title: "Customers and Accounts",
    summary: "Create users, review customer details, adjust credits, and handle account problems.",
    icon: Users,
    sections: [
      {
        title: "What admins can do",
        bullets: [
          "Search customers by name or email from the Admin Dashboard.",
          "Open the customer detail sheet to review profile data, purchases, downloads, and current credit state.",
          "Create a user when support needs to provision an account manually.",
          "Send password recovery, ban or unban an account, delete a user, or toggle unlimited credits when appropriate.",
        ],
      },
      {
        title: "Credit adjustments",
        body: "Credits affect real customer access. Treat manual grants like production financial adjustments.",
        bullets: [
          "Use Give Credits for verified purchase recovery, goodwill adjustments, or staff-approved comps.",
          "Check the credit ledger and transactions before granting credits for a missing-payment report.",
          "Use unlimited credits only for staff, test accounts, or deliberate VIP access.",
          "Record the support reason in admin notes when the customer flow requires follow-up.",
        ],
      },
      {
        title: "Common checks",
        bullets: [
          "If an admin page is blank, confirm the signed-in user has the admin role in the active Supabase project.",
          "If a customer cannot download, check their balance, previous downloads, unlock state, and download window.",
          "If deletion fails, check related app rows and Supabase Auth behavior before retrying.",
        ],
      },
    ],
  },
  {
    slug: "racecards",
    title: "RaceCard Operations",
    summary: "Upload PDFs, sync S3 inventory, verify metadata, and understand customer unlock behavior.",
    icon: FileText,
    sections: [
      {
        title: "Publishing flow",
        bullets: [
          "Use the Admin Dashboard RaceCards tab to upload RaceCard PDFs.",
          "The upload flow generates a signed upload URL, stores the file, parses track/date metadata, and inserts the RaceCard row.",
          "Use S3 sync when files already exist in the bucket but are not yet listed in Supabase.",
          "After upload or sync, verify track name, track code, race date, file name, metadata, and public availability.",
        ],
      },
      {
        title: "Digital RaceCard behavior",
        bullets: [
          "Public visitors can see basic RaceCard context and locked previews.",
          "Admins and purchasers unlock protected selections, predictions, and official results when digitization/results data exists.",
          "Digitization status explains whether a PDF has been processed into structured picks and results.",
          "If a digital detail page looks sparse, check the RaceCard metadata and prediction rows before assuming the frontend is broken.",
        ],
      },
      {
        title: "Operational rules",
        bullets: [
          "Keep track codes consistent so browse search, track profiles, weather badges, and reports stay readable.",
          "Avoid deleting RaceCards that customers already downloaded unless the file is truly invalid.",
          "Check /racecards by date after any inventory update.",
        ],
      },
    ],
  },
  {
    slug: "payments",
    title: "Payments, Credits, and Billing",
    summary: "Operate Stripe checkout, credit packages, invoices, and billing portal support.",
    icon: CreditCard,
    sections: [
      {
        title: "How checkout works",
        bullets: [
          "Customers choose a credit package on Buy Credits.",
          "The app calls create-checkout-session and redirects the customer to Stripe.",
          "Stripe webhook and post-payment confirmation logic reconcile the purchase back into Supabase.",
          "Credits appear after the transaction and ledger rows are written.",
        ],
      },
      {
        title: "Admin pricing",
        bullets: [
          "Use Admin -> Credit packages to create, edit, activate, deactivate, and sort packages.",
          "Unlimited packages grant ongoing access instead of a finite credit count.",
          "Deactivate old offers instead of deleting packages referenced by previous transactions.",
          "After major pricing changes, test Pricing, Buy Credits, and a Stripe test-mode checkout.",
        ],
      },
      {
        title: "Billing support",
        bullets: [
          "Invoices and billing management use the customer-portal Edge Function.",
          "If billing management fails, confirm the app Vite environment and Supabase linked project point to the same project.",
          "If credits are missing after payment, ask for a Stripe receipt or checkout session id and compare Stripe, transactions, and credit ledger.",
        ],
      },
    ],
  },
  {
    slug: "analytics",
    title: "Analytics and Funnel Diagnosis",
    summary: "Understand visitors, sources, checkout drop-off, CTA clicks, audit logs, and Meta Ads.",
    icon: BarChart3,
    sections: [
      {
        title: "What the page shows",
        bullets: [
          "Visitors, new visitors, returning visitors, bounce rate, pageviews, top source, pricing-to-buy rate, and checkout starts.",
          "Daily traffic, signups, RaceCard downloads, purchase funnel steps, top exit pages, and CTA click map.",
          "UTM coverage and source attribution show where visitors came from.",
          "Audit log and error panels show recent admin/security events.",
        ],
      },
      {
        title: "AI funnel analyst",
        body: "Use this as a plain-English diagnosis of first-party behavior, not as a replacement for checking the raw numbers.",
        bullets: [
          "Read conversion issues for where users slow down before purchase.",
          "Prioritize fixes when high-traffic sources fail to reach pricing, Buy Credits, or checkout.",
          "Use Print report when you need a share-ready snapshot.",
        ],
      },
      {
        title: "Dependencies",
        bullets: [
          "site_analytics_events must exist for first-party analytics.",
          "fb_ads_insights and Meta server secrets are required for Facebook Ads panels.",
          "UTM tags must be present on ad links for campaign reporting to be useful.",
        ],
      },
    ],
  },
  {
    slug: "settings",
    title: "Settings and Integrations",
    summary: "Configure AI providers, SMTP, broadcasts, CAPTCHA, Stripe, analytics, racetracks, and ticker content.",
    icon: Settings,
    sections: [
      {
        title: "Encrypted settings",
        bullets: [
          "Settings are managed through the manage-app-settings Edge Function.",
          "Secrets are encrypted at rest; leave a field blank to keep the existing value.",
          "Do not paste secrets into source files, screenshots, support messages, or commits.",
        ],
      },
      {
        title: "Integration tabs",
        bullets: [
          "AI providers controls the DATAEEL assistant provider, model, keys, and daily cost cap.",
          "SMTP powers admin notifications and broadcast email.",
          "CAPTCHA protects public forms.",
          "Stripe controls test/live mode display, but Edge Function secrets must also be configured server-side.",
          "Analytics & site, Racetracks, and Breaking news ticker control public-site behavior.",
        ],
      },
      {
        title: "When settings do not take effect",
        bullets: [
          "Confirm the Edge Function is deployed.",
          "Confirm the active Supabase project is the same one the frontend is using.",
          "For Stripe, confirm both Supabase secrets and Admin Settings values when applicable.",
        ],
      },
    ],
  },
  {
    slug: "support",
    title: "Support and Communications",
    summary: "Handle contact submissions, admin notes, statuses, SMTP, and broadcast email.",
    icon: Inbox,
    sections: [
      {
        title: "Support inbox",
        bullets: [
          "Public contact form submissions appear in Admin -> Support inbox.",
          "Set status to open, in progress, or closed as the ticket moves through support.",
          "Use admin notes to record what was checked and what response was given.",
        ],
      },
      {
        title: "Broadcast email",
        bullets: [
          "Broadcast email sends plain-text messages to confirmed users.",
          "Preview recipient count before sending.",
          "Use SMTP settings for the actual provider credentials and sender details.",
        ],
      },
      {
        title: "Support habits",
        bullets: [
          "For billing problems, check Stripe, transactions, and credit ledger before granting credits.",
          "For RaceCard access issues, check downloads, credit balance, unlock state, and race date.",
          "Close submissions only after the issue is resolved or no further action is needed.",
        ],
      },
    ],
  },
  {
    slug: "reports",
    title: "Reports and Financial Review",
    summary: "Use reports, download logs, credit ledger, and financial dashboard exports.",
    icon: Table2,
    sections: [
      {
        title: "Reports page",
        bullets: [
          "By user shows who downloaded what.",
          "By racecard shows which PDFs have the most demand.",
          "By track aggregates demand by track label.",
          "Credit ledger shows purchases, downloads, grants, balance changes, and references.",
        ],
      },
      {
        title: "Financial dashboard",
        bullets: [
          "Use this for revenue, completed purchases, package mix, credits sold, and average order value.",
          "Use CSV exports for reconciliation and accountant handoff.",
          "If revenue looks incomplete, check Stripe mode, webhook delivery, transaction status, and Supabase project targeting.",
        ],
      },
      {
        title: "Audit use cases",
        bullets: [
          "Missing credits: compare transactions and credit ledger.",
          "Unexpected download: check download log and customer detail.",
          "Price question: compare historical transaction records to current package setup.",
        ],
      },
    ],
  },
  {
    slug: "pages-seo",
    title: "Pages and SEO Tools",
    summary: "Operate editable pages, the visual page editor, and SEO/performance utilities.",
    icon: Compass,
    sections: [
      {
        title: "Editable pages",
        bullets: [
          "Admin -> Pages lists editable site pages and their publish state.",
          "Unpublished pages fall back to built-in React pages.",
          "Admin -> Page editor opens the visual editor for page content.",
        ],
      },
      {
        title: "SEO tools",
        bullets: [
          "Use SEO tools to inspect page coverage, keywords, speed, audits, and meta description opportunities.",
          "Treat SEO output as current situational awareness; re-check after content or performance changes.",
          "Customer-facing copy should remain accurate to RaceCards, credits, and responsible-use disclaimers.",
        ],
      },
      {
        title: "Publishing checklist",
        bullets: [
          "Preview the page before publishing.",
          "Check mobile layout and text overflow.",
          "Confirm legal, pricing, and credit claims match the actual app behavior.",
        ],
      },
    ],
  },
];

function GuideCards({ cards }: { cards: GuideCard[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-foreground text-lg">{card.title}</CardTitle>
            <CardDescription>{card.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {card.items.map((item) => (
                <li key={item} className="border-l-2 border-primary/30 pl-3">
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

const AdminHelp = () => {
  const { topicSlug } = useParams();
  const selectedTopic = topicSlug ? helpTopics.find((topic) => topic.slug === topicSlug) : undefined;

  if (topicSlug && !selectedTopic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pb-16">
          <PageHero
            backTo="/admin/help"
            backLabel="Back to Help"
            badge="Admin"
            title="Help topic not found"
            subtitle="That help page does not exist. Return to the Help Center to choose an available topic."
            align="left"
            containerClassName="max-w-[1400px]"
            sectionClassName="pb-8"
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (selectedTopic) {
    const Icon = selectedTopic.icon;
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pb-16">
          <PageHero
            backTo="/admin/help"
            backLabel="Back to Help"
            badge="Admin Help"
            title={
              <>
                {selectedTopic.title.split(" ")[0]}{" "}
                <span className="text-neon">{selectedTopic.title.split(" ").slice(1).join(" ")}</span>
              </>
            }
            subtitle={selectedTopic.summary}
            align="left"
            containerClassName="max-w-[1400px]"
            sectionClassName="pb-8"
          />
          <div className="container mx-auto max-w-[1400px] px-4 pt-6 md:pt-8">
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="space-y-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Detailed page</p>
                      <p className="text-xs text-muted-foreground">/{selectedTopic.slug}</p>
                    </div>
                  </div>
                </div>
                <nav className="rounded-lg border border-border bg-card p-2">
                  {helpTopics.map((topic) => (
                    <Link
                      key={topic.slug}
                      to={`/admin/help/${topic.slug}`}
                      className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                        topic.slug === selectedTopic.slug
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {topic.title}
                    </Link>
                  ))}
                </nav>
              </aside>

              <div className="space-y-5">
                {selectedTopic.sections.map((section) => (
                  <Card key={section.title} className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">{section.title}</CardTitle>
                      {section.body ? <CardDescription>{section.body}</CardDescription> : null}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="border-l-2 border-primary/30 pl-3">
                            {bullet}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pb-16">
        <PageHero
          backTo="/admin"
          backLabel="Back to Admin"
          badge="Admin"
          title={
            <>
              Help <span className="text-neon">Center</span>
            </>
          }
          subtitle="Admin documentation for operating DATAEEL, understanding the application, and handling common workflows."
          align="left"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />

        <div className="container mx-auto max-w-[1400px] px-4 pt-6 md:pt-8">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-8">
            {helpTopics.map((item) => (
              <Link
                key={item.slug}
                to={`/admin/help/${item.slug}`}
                className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-foreground truncate">{item.title}</span>
                  <span className="block text-xs text-muted-foreground truncate">{item.summary}</span>
                </div>
              </Link>
            ))}
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="admin">Admin sections</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
              <TabsTrigger value="reference">Reference</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <GuideCards cards={overviewCards} />
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Admin access model
                  </CardTitle>
                  <CardDescription>Admin pages are protected routes and require an authenticated admin user.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm leading-relaxed text-muted-foreground space-y-3">
                  <p>
                    The app checks admin status through Supabase role data before rendering admin pages. If an admin page
                    redirects or appears blank, verify the user is signed in and has the admin role in the active Supabase
                    project.
                  </p>
                  <p>
                    Admin actions that change users, settings, or credits should be treated as production operations. Use
                    audit records, Stripe records, and the credit ledger when investigating customer-impacting changes.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <GuideCards cards={adminSections} />
            </TabsContent>

            <TabsContent value="workflows">
              <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-4">
                {workflows.map((workflow, index) => (
                  <AccordionItem key={workflow.title} value={`workflow-${index}`}>
                    <AccordionTrigger className="text-left text-foreground">{workflow.title}</AccordionTrigger>
                    <AccordionContent>
                      <ol className="space-y-3 pb-2 text-sm leading-relaxed text-muted-foreground">
                        {workflow.steps.map((step, stepIndex) => (
                          <li key={step} className="flex gap-3">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                              {stepIndex + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </TabsContent>

            <TabsContent value="operations" className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-primary" />
                    Daily admin checklist
                  </CardTitle>
                  <CardDescription>Use this before changing settings, diagnosing payments, or publishing updates.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {operationsChecklist.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Badge variant="outline" className="mt-0.5 h-5 shrink-0 px-1.5 text-[10px]">
                          Check
                        </Badge>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Feature dependencies</CardTitle>
                  <CardDescription>What must exist for admin tools to work correctly.</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {dependencyNotes.map((item) => (
                      <li key={item} className="border-l-2 border-warning/50 pl-3">
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reference" className="space-y-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Compass className="h-5 w-5 text-primary" />
                    Admin console map
                  </CardTitle>
                  <CardDescription>Where each admin screen lives. The address is what appears in the browser bar.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[170px]">Screen</TableHead>
                          <TableHead className="w-[190px]">Address</TableHead>
                          <TableHead>What you do there</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {consoleMap.map((row) => (
                          <TableRow key={row.path}>
                            <TableCell className="font-medium text-foreground">{row.screen}</TableCell>
                            <TableCell>
                              <code className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{row.path}</code>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{row.summary}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Where everything lives
                  </CardTitle>
                  <CardDescription>Which system backs each part of the platform — useful when something looks off.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[230px]">If you're dealing with…</TableHead>
                          <TableHead className="w-[170px]">It lives in</TableHead>
                          <TableHead>Notes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemsMap.map((row) => (
                          <TableRow key={row.subject}>
                            <TableCell className="font-medium text-foreground">{row.subject}</TableCell>
                            <TableCell className="text-primary">{row.system}</TableCell>
                            <TableCell className="text-muted-foreground">{row.note}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground flex items-center gap-2">
                    <Book className="h-5 w-5 text-primary" />
                    Glossary
                  </CardTitle>
                  <CardDescription>Key terms in plain language.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {glossary.map((entry) => (
                      <div key={entry.term} className="rounded-lg border border-border bg-background/40 p-3">
                        <dt className="text-sm font-semibold text-foreground">{entry.term}</dt>
                        <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{entry.definition}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminHelp;
