import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Bot,
  CreditCard,
  FileText,
  HelpCircle,
  Inbox,
  Package,
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
      "Use By racecard to see download totals for each RaceCard PDF.",
      "Use By track to understand which tracks drive the most downloads.",
      "Use Credit ledger to audit credit grants, purchases, downloads, balance changes, and export CSV records.",
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
    description: "First-party visitor, source, and purchase-funnel analytics.",
    items: [
      "Monitor visitors, new versus returning users, bounce rate, top traffic source, pricing-to-buy flow, checkout starts, and RaceCard downloads.",
      "Read the AI analysis panel as deterministic funnel diagnosis from first-party behavior, not an external model response.",
      "If analytics are unavailable, apply the site_analytics_events migration to the active Supabase database.",
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

const dependencyNotes = [
  "site_analytics_events is required for first-party analytics.",
  "audit_log is required for the Analytics audit and error panels.",
  "breaking_news_items, racecard_predictions, and racetrack_profiles migrations support ticker, digitized RaceCards, and track profile features.",
  "manage-app-settings backs encrypted admin settings.",
  "create-checkout-session, stripe-webhook, customer-portal, download-racecard, racing-assistant, ai-admin, upload, sync, and email functions must be deployed for the related features.",
  "Stripe Dashboard webhook endpoints must point to the Supabase stripe-webhook URL shown in Admin Settings.",
  "The DATAEEL assistant requires a configured provider key or a usable environment secret.",
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
            {[
              { label: "Customers", icon: Users },
              { label: "RaceCards", icon: FileText },
              { label: "Credits", icon: CreditCard },
              { label: "Settings", icon: Settings },
              { label: "Support", icon: Inbox },
              { label: "Reports", icon: Table2 },
              { label: "Analytics", icon: BarChart3 },
              { label: "AI", icon: Bot },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
            ))}
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="mb-6 flex h-auto flex-wrap gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="admin">Admin sections</TabsTrigger>
              <TabsTrigger value="workflows">Workflows</TabsTrigger>
              <TabsTrigger value="operations">Operations</TabsTrigger>
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
          </Tabs>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminHelp;
