import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/PageHero";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  ExternalLink,
  FileSearch,
  Gauge,
  Globe2,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { analyzePageSeo, normalizeAuditUrl, type KeywordAnalysis } from "@/lib/seoTools";

type LighthouseCategory = {
  score: number | null;
  title: string;
};

type LighthouseAudit = {
  id: string;
  title: string;
  description?: string;
  score: number | null;
  displayValue?: string;
};

type PageSpeedResult = {
  loadingExperience?: {
    metrics?: Record<string, { percentile?: number; category?: string }>;
  };
  lighthouseResult?: {
    finalUrl?: string;
    categories?: Record<string, LighthouseCategory>;
    audits?: Record<string, LighthouseAudit>;
  };
};

type Strategy = "mobile" | "desktop";

const PAGE_OPTIONS = [
  { label: "Home", value: "/" },
  { label: "Pricing", value: "/pricing" },
  { label: "RaceCards", value: "/racecards" },
  { label: "Betting Basics", value: "/betting-basics" },
  { label: "How to Read a RaceCard", value: "/how-to-read-racecard" },
];

const FREE_RESOURCES = [
  {
    name: "PageSpeed Insights API",
    use: "Live Core Web Vitals, Lighthouse performance, accessibility, SEO, and best-practices checks.",
    link: "https://developers.google.com/speed/docs/insights/v5/get-started",
    note: "Free and works without an API key for light usage; add a key later for frequent automated checks.",
  },
  {
    name: "Google Lighthouse",
    use: "Local open-source audits during development and CI.",
    link: "https://github.com/GoogleChrome/lighthouse",
    note: "Best for repeatable pre-deploy checks where browser access is available.",
  },
  {
    name: "Unlighthouse",
    use: "Free crawl-style Lighthouse scans across many pages.",
    link: "https://unlighthouse.dev/",
    note: "Useful when the site grows beyond single-page manual checks.",
  },
  {
    name: "Google Search Console API",
    use: "Real search queries, impressions, clicks, CTR, and average position for verified properties.",
    link: "https://support.google.com/webmasters/answer/12919192",
    note: "Best source for keyword truth, but requires Google property access and OAuth wiring.",
  },
];

function formatScore(score: number | null | undefined): string {
  if (score == null) return "n/a";
  return Math.round(score * 100).toString();
}

function scoreTone(score: number | null | undefined): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 0.9) return "text-success";
  if (score >= 0.5) return "text-yellow-500";
  return "text-destructive";
}

function metricMs(value?: number): string {
  if (value == null) return "n/a";
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`;
  return `${Math.round(value)}ms`;
}

function CategoryScore({ label, category }: { label: string; category?: LighthouseCategory }) {
  const value = category?.score ?? null;
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-3xl font-bold font-mono-data ${scoreTone(value)}`}>{formatScore(value)}</div>
        <Progress value={value == null ? 0 : value * 100} className="mt-3 h-2" />
      </CardContent>
    </Card>
  );
}

function KeywordResults({ analysis }: { analysis: KeywordAnalysis }) {
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Indexable words</div>
            <div className="text-2xl font-bold font-mono-data">{analysis.totalWords}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Unique terms</div>
            <div className="text-2xl font-bold font-mono-data">{analysis.uniqueWords}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Headings</div>
            <div className="text-2xl font-bold font-mono-data">
              {analysis.h1Count} H1 / {analysis.h2Count} H2
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Images missing alt</div>
            <div className={analysis.imagesMissingAlt > 0 ? "text-2xl font-bold font-mono-data text-destructive" : "text-2xl font-bold font-mono-data text-success"}>
              {analysis.imagesMissingAlt}/{analysis.imageCount}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">Keyword density</CardTitle>
          <CardDescription>Counts are directional. Use Search Console later for actual query demand and ranking position.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.keywordResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">Enter target keywords to see density.</p>
          ) : (
            analysis.keywordResults.map((result) => (
              <div key={result.keyword} className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,1fr)_90px_120px] sm:items-center">
                <div className="font-medium text-foreground">{result.keyword}</div>
                <div className="text-sm font-mono-data">{result.count} hits</div>
                <Badge variant={result.count === 0 ? "destructive" : "secondary"} className="justify-center">
                  {result.density.toFixed(2)}%
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground">On-page signals</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Title</div>
            <div className="text-foreground">{analysis.title || "No title detected"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Meta description</div>
            <div className="text-foreground">{analysis.metaDescription || "No meta description detected"}</div>
          </div>
          {analysis.recommendations.length > 0 ? (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Recommended fixes
              </div>
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                {analysis.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-md border border-success/30 bg-success/10 p-3 text-success">
              No immediate on-page issues detected from this input.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const AdminSeoTools = () => {
  const [urlInput, setUrlInput] = useState("/");
  const [strategy, setStrategy] = useState<Strategy>("mobile");
  const [pageSpeedApiKey, setPageSpeedApiKey] = useState("");
  const [pageSpeedLoading, setPageSpeedLoading] = useState(false);
  const [pageSpeedError, setPageSpeedError] = useState<string | null>(null);
  const [pageSpeed, setPageSpeed] = useState<PageSpeedResult | null>(null);
  const [keywordInput, setKeywordInput] = useState("race cards, horse racing, racecard analysis");
  const [contentInput, setContentInput] = useState("");
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);

  const auditUrl = useMemo(() => {
    try {
      return normalizeAuditUrl(urlInput, window.location.origin);
    } catch {
      return "";
    }
  }, [urlInput]);

  const runPageSpeed = async () => {
    if (!auditUrl) {
      setPageSpeedError("Enter a valid URL or site path.");
      return;
    }

    setPageSpeedLoading(true);
    setPageSpeedError(null);
    try {
      const params = new URLSearchParams({
        url: auditUrl,
        strategy,
        category: "performance",
      });
      if (pageSpeedApiKey.trim()) params.set("key", pageSpeedApiKey.trim());
      params.append("category", "seo");
      params.append("category", "accessibility");
      params.append("category", "best-practices");
      const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error?.message ?? "PageSpeed Insights failed.");
      }
      setPageSpeed(data as PageSpeedResult);
    } catch (err) {
      setPageSpeed(null);
      setPageSpeedError(err instanceof Error ? err.message : "PageSpeed Insights failed.");
    } finally {
      setPageSpeedLoading(false);
    }
  };

  const fetchCurrentPageHtml = async () => {
    if (!auditUrl) {
      setKeywordError("Enter a valid URL or site path.");
      return;
    }
    const parsed = new URL(auditUrl);
    if (parsed.origin !== window.location.origin) {
      setKeywordError("Browser security only allows direct page fetches from this site. Paste external page HTML or text instead.");
      return;
    }

    setKeywordLoading(true);
    setKeywordError(null);
    try {
      const response = await fetch(`${parsed.pathname}${parsed.search}`);
      if (!response.ok) throw new Error(`Could not fetch ${parsed.pathname}.`);
      const html = await response.text();
      setContentInput(html);
      setKeywordAnalysis(analyzePageSeo(html, keywordInput));
    } catch (err) {
      setKeywordAnalysis(null);
      setKeywordError(err instanceof Error ? err.message : "Could not fetch page HTML.");
    } finally {
      setKeywordLoading(false);
    }
  };

  const analyzeContent = () => {
    if (!contentInput.trim()) {
      toast.error("Paste page HTML/text or fetch a same-site page first.");
      return;
    }
    setKeywordError(null);
    setKeywordAnalysis(analyzePageSeo(contentInput, keywordInput));
  };

  const categories = pageSpeed?.lighthouseResult?.categories ?? {};
  const audits = pageSpeed?.lighthouseResult?.audits ?? {};
  const fieldMetrics = pageSpeed?.loadingExperience?.metrics ?? {};
  const opportunities = ["largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "render-blocking-resources", "uses-optimized-images"]
    .map((id) => audits[id])
    .filter(Boolean);

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
              SEO <span className="text-neon">tools</span>
            </>
          }
          subtitle="Situational awareness for technical SEO, keyword coverage, and page-speed issues using free public resources."
          align="left"
          containerClassName="max-w-[1400px]"
          sectionClassName="pb-8"
        />

        <div className="container mx-auto max-w-[1400px] px-4 pt-6 md:pt-8">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <Tabs defaultValue="pagespeed" className="min-w-0">
              <TabsList className="mb-4 flex h-auto flex-wrap gap-1">
                <TabsTrigger value="pagespeed" className="gap-2">
                  <Gauge className="h-4 w-4" /> Page speed
                </TabsTrigger>
                <TabsTrigger value="keywords" className="gap-2">
                  <Search className="h-4 w-4" /> Keyword analysis
                </TabsTrigger>
              </TabsList>

              <Card className="mb-4 bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Audit target</CardTitle>
                  <CardDescription>Use a path on this site or a full public URL for PageSpeed Insights.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="space-y-1.5">
                      <Label htmlFor="page-preset">Common pages</Label>
                      <select
                        id="page-preset"
                        value={urlInput}
                        onChange={(event) => setUrlInput(event.target.value)}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {PAGE_OPTIONS.map((page) => (
                          <option key={page.value} value={page.value}>
                            {page.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="audit-url">URL or path</Label>
                      <Input
                        id="audit-url"
                        value={urlInput}
                        onChange={(event) => setUrlInput(event.target.value)}
                        placeholder="/pricing or https://www.dataeel.com/pricing"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Globe2 className="h-4 w-4 text-primary" />
                    Resolved target: <code className="rounded bg-muted px-2 py-1 font-mono">{auditUrl || "Invalid URL"}</code>
                  </div>
                </CardContent>
              </Card>

              <TabsContent value="pagespeed">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <CardTitle className="text-foreground">PageSpeed Insights</CardTitle>
                        <CardDescription>Runs Google Lighthouse categories through the free PageSpeed Insights API.</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={strategy === "mobile" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStrategy("mobile")}
                        >
                          Mobile
                        </Button>
                        <Button
                          type="button"
                          variant={strategy === "desktop" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setStrategy("desktop")}
                        >
                          Desktop
                        </Button>
                        <Button onClick={runPageSpeed} disabled={pageSpeedLoading || !auditUrl} size="sm" className="gap-2">
                          {pageSpeedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gauge className="h-4 w-4" />}
                          Run audit
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                        PageSpeed can run without a key for light usage, but Google may throttle unauthenticated requests. Use
                        a temporary API key here for repeated checks; it stays only in this browser session.
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="pagespeed-key">Optional PageSpeed API key</Label>
                        <Input
                          id="pagespeed-key"
                          type="password"
                          value={pageSpeedApiKey}
                          onChange={(event) => setPageSpeedApiKey(event.target.value)}
                          placeholder="AIza..."
                          className="font-mono text-sm"
                          autoComplete="off"
                        />
                      </div>
                    </div>

                    {pageSpeedError ? (
                      <Alert variant="destructive">
                        <AlertTitle>PageSpeed unavailable</AlertTitle>
                        <AlertDescription>{pageSpeedError}</AlertDescription>
                      </Alert>
                    ) : null}

                    {pageSpeed ? (
                      <>
                        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                          <CategoryScore label="Performance" category={categories.performance} />
                          <CategoryScore label="SEO" category={categories.seo} />
                          <CategoryScore label="Accessibility" category={categories.accessibility} />
                          <CategoryScore label="Best practices" category={categories["best-practices"]} />
                        </div>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className="rounded-md border border-border p-3">
                            <div className="text-xs text-muted-foreground">Field LCP</div>
                            <div className="text-xl font-semibold font-mono-data">{metricMs(fieldMetrics.LARGEST_CONTENTFUL_PAINT_MS?.percentile)}</div>
                          </div>
                          <div className="rounded-md border border-border p-3">
                            <div className="text-xs text-muted-foreground">Field INP</div>
                            <div className="text-xl font-semibold font-mono-data">{metricMs(fieldMetrics.INTERACTION_TO_NEXT_PAINT?.percentile)}</div>
                          </div>
                          <div className="rounded-md border border-border p-3">
                            <div className="text-xs text-muted-foreground">Field CLS</div>
                            <div className="text-xl font-semibold font-mono-data">
                              {fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE?.percentile == null
                                ? "n/a"
                                : (fieldMetrics.CUMULATIVE_LAYOUT_SHIFT_SCORE.percentile / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold text-foreground">Priority diagnostics</h3>
                          {opportunities.map((audit) => (
                            <div key={audit.id} className="rounded-md border border-border p-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="font-medium text-foreground">{audit.title}</div>
                                <Badge variant={audit.score != null && audit.score < 0.9 ? "secondary" : "outline"}>
                                  {audit.displayValue ?? formatScore(audit.score)}
                                </Badge>
                              </div>
                              {audit.description ? (
                                <p className="mt-1 text-xs text-muted-foreground">{audit.description.replace(/<[^>]+>/g, "")}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                        Run an audit to see Lighthouse scores and Core Web Vitals.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="keywords">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Keyword analysis</CardTitle>
                    <CardDescription>Check page text, headings, metadata, and target keyword coverage.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="keywords">Target keywords</Label>
                      <Input
                        id="keywords"
                        value={keywordInput}
                        onChange={(event) => setKeywordInput(event.target.value)}
                        placeholder="race cards, horse racing, handicapping"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={fetchCurrentPageHtml} disabled={keywordLoading || !auditUrl} className="gap-2">
                        {keywordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}
                        Fetch same-site page
                      </Button>
                      <Button variant="outline" onClick={analyzeContent} className="gap-2">
                        <Search className="h-4 w-4" />
                        Analyze pasted content
                      </Button>
                    </div>
                    {keywordError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Keyword analysis unavailable</AlertTitle>
                        <AlertDescription>{keywordError}</AlertDescription>
                      </Alert>
                    ) : null}
                    <div className="space-y-1.5">
                      <Label htmlFor="page-content">Page HTML or text</Label>
                      <Textarea
                        id="page-content"
                        value={contentInput}
                        onChange={(event) => setContentInput(event.target.value)}
                        rows={8}
                        placeholder="Paste rendered page text or HTML here."
                        className="font-mono text-xs"
                      />
                    </div>
                    {keywordAnalysis ? <KeywordResults analysis={keywordAnalysis} /> : null}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <aside className="space-y-4">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Free resources
                  </CardTitle>
                  <CardDescription>Use these for current SEO and performance awareness without a paid SEO suite.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {FREE_RESOURCES.map((resource) => (
                    <a
                      key={resource.name}
                      href={resource.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-md border border-border p-3 transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-foreground">{resource.name}</div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{resource.use}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{resource.note}</p>
                    </a>
                  ))}
                </CardContent>
              </Card>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Keyword data caveat</AlertTitle>
                <AlertDescription>
                  On-page density does not reveal search volume or rank. Search Console is the free source of truth once the
                  domain is verified and connected.
                </AlertDescription>
              </Alert>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminSeoTools;
