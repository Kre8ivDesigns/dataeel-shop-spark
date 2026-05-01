import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Eye, EyeOff, Save, CheckCircle2, XCircle, Copy, Check, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminAiSettingsPanel } from "@/components/admin/AdminAiSettingsPanel";
import { AdminSmtpSettingsPanel } from "@/components/admin/AdminSmtpSettingsPanel";
import {
  EMPTY_SETTINGS_FORM,
  SMTP_PROVIDER_PRESETS,
  type SettingStatus,
  type SettingsForm,
  type SettingsStatus,
} from "@/components/admin/adminSettingsTypes";

// ── Constants ─────────────────────────────────────────────────────────────────

const STRIPE_WEBHOOK_PATH = "/functions/v1/stripe-webhook";

// ── Sub-components ────────────────────────────────────────────────────────────

const ConfiguredBadge = ({ status }: { status?: SettingStatus }) => {
  if (!status) return null;
  return status.configured ? (
    <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
      <CheckCircle2 className="h-3 w-3" />
      {status.preview ?? "Configured"}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <XCircle className="h-3 w-3" />
      Not set
    </span>
  );
};

const SecretInput = ({
  id,
  value,
  placeholder,
  onChange,
  className,
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  className?: string;
}) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        placeholder={placeholder ?? "Enter new value to update…"}
        onChange={(e) => onChange(e.target.value)}
        className={`pr-10 font-mono text-sm${className ? ` ${className}` : ""}`}
        autoComplete="new-password"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
};

const SaveButton = ({ onClick, saving, disabled }: { onClick: () => void; saving: boolean; disabled?: boolean }) => (
  <Button onClick={onClick} disabled={saving || disabled} className="bg-primary text-primary-foreground font-semibold">
    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
    {saving ? "Saving…" : "Save"}
  </Button>
);

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!navigator?.clipboard?.writeText) {
      toast.error("Clipboard API not available in this browser");
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleCopy} className="h-7 px-2 shrink-0">
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      <span className="ml-1 text-xs">{copied ? "Copied!" : "Copy"}</span>
    </Button>
  );
};

const WebhookUrlRow = ({ label, url, badge }: { label: string; url: string; badge: ReactNode }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-2">
      {badge}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <code className="flex-1 min-w-0 rounded bg-muted px-2 py-1.5 text-xs font-mono truncate block">
        {url}
      </code>
      <CopyButton text={url} />
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

const AdminSettings = () => {
  const [status, setStatus] = useState<SettingsStatus>({});
  const [form, setForm] = useState<SettingsForm>(EMPTY_SETTINGS_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const set = (key: keyof SettingsForm) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-app-settings", {
        body: { action: "get" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setStatus(data.settings ?? {});
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const saveSection = async (section: string, keys: (keyof SettingsForm)[]) => {
    // Validate Stripe key prefixes before sending
    if (section === "stripe") {
      if (form.stripe_test_publishable_key && !form.stripe_test_publishable_key.startsWith("pk_test_")) {
        toast.error("Test publishable key must start with pk_test_");
        return;
      }
      if (form.stripe_test_secret_key && !form.stripe_test_secret_key.startsWith("sk_test_")) {
        toast.error("Test secret key must start with sk_test_");
        return;
      }
      if (form.stripe_publishable_key && !form.stripe_publishable_key.startsWith("pk_live_")) {
        toast.error("Live publishable key must start with pk_live_");
        return;
      }
      if (form.stripe_secret_key && !form.stripe_secret_key.startsWith("sk_live_")) {
        toast.error("Live secret key must start with sk_live_");
        return;
      }
    }

    // Non-secret selector fields that are always included in the payload
    const alwaysInclude: (keyof SettingsForm)[] = ["ai_chat_provider", "smtp_provider", "stripe_mode"];

    const payload: Partial<SettingsForm> = {};
    keys.forEach((k) => { if (alwaysInclude.includes(k) || form[k] !== "") payload[k] = form[k]; });

    if (Object.keys(payload).length === 0) {
      toast.info("No changes to save — enter a new value to update a field");
      return;
    }

    setSaving(section);
    try {
      const { data, error } = await supabase.functions.invoke("manage-app-settings", {
        body: { action: "set", settings: payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Settings saved");
      // Clear saved fields from the form and refresh status
      const cleared = { ...form };
      keys.forEach((k) => {
        const key = k as keyof SettingsForm;
        if (alwaysInclude.includes(key)) {
          cleared[key] = form[key] || EMPTY_SETTINGS_FORM[key];
          return;
        }
        cleared[key] = "";
      });
      setForm(cleared);
      fetchStatus();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save settings");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-[1400px]">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 text-foreground/50 hover:text-foreground mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </Link>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Secrets are encrypted with AES-256-GCM at rest. Leave a field blank to keep the existing value.
              Edge Functions still read payment keys from Supabase secrets (<code className="text-xs bg-muted px-1 rounded">STRIPE_SECRET_KEY</code>, etc.); store duplicates here for a single admin record if you want.
            </p>
          </div>

          <Tabs defaultValue="ai">
            <TabsList className="mb-4 flex flex-wrap h-auto gap-1">
              <TabsTrigger value="ai">AI providers</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="captcha">CAPTCHA</TabsTrigger>
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
              <TabsTrigger value="analytics">Analytics &amp; site</TabsTrigger>
            </TabsList>

            <TabsContent value="ai">
              <p className="text-sm text-muted-foreground mb-4">
                Racing assistant uses the <strong className="text-foreground">active provider</strong>. Keys are encrypted via{" "}
                <code className="text-xs bg-muted px-1 rounded">manage-app-settings</code>. Deploy the{" "}
                <code className="text-xs bg-muted px-1 rounded">ai-admin</code> and{" "}
                <code className="text-xs bg-muted px-1 rounded">racing-assistant</code> Edge Functions.
              </p>
              <AdminAiSettingsPanel
                status={status}
                form={form}
                set={set}
                SecretInput={SecretInput}
                ConfiguredBadge={ConfiguredBadge}
                saving={saving === "ai"}
                onSaveAi={() =>
                  saveSection("ai", [
                    "ai_chat_provider",
                    "openrouter_api_key",
                    "openrouter_model",
                    "anthropic_api_key",
                    "anthropic_model",
                    "openai_api_key",
                    "openai_model",
                  ])
                }
              />
            </TabsContent>

            {/* ── SMTP ── */}
            <TabsContent value="smtp">
              <AdminSmtpSettingsPanel
                status={status}
                form={form}
                set={set}
                SecretInput={SecretInput}
                ConfiguredBadge={ConfiguredBadge}
                saving={saving === "smtp"}
                onSave={() =>
                  saveSection("smtp", [
                    "smtp_provider",
                    "smtp_host",
                    "smtp_port",
                    "smtp_user",
                    "smtp_password",
                    "smtp_from",
                    "smtp_from_name",
                    "smtp_reply_to",
                  ])
                }
              />

            </TabsContent>

            {/* ── CAPTCHA ── */}
            <TabsContent value="captcha">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">CAPTCHA</CardTitle>
                  <CardDescription>Bot protection on public forms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="captcha-provider">Provider</Label>
                    <Select value={form.captcha_provider || "hcaptcha"} onValueChange={set("captcha_provider")}>
                      <SelectTrigger id="captcha-provider"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hcaptcha">hCaptcha</SelectItem>
                        <SelectItem value="recaptcha">reCAPTCHA v2</SelectItem>
                        <SelectItem value="turnstile">Cloudflare Turnstile</SelectItem>
                        <SelectItem value="none">None / Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="captcha-site">Site Key</Label><ConfiguredBadge status={status.captcha_site_key} /></div>
                    <Input id="captcha-site" value={form.captcha_site_key} placeholder="Public site key" onChange={(e) => set("captcha_site_key")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="captcha-secret">Secret Key</Label><ConfiguredBadge status={status.captcha_secret_key} /></div>
                    <SecretInput id="captcha-secret" value={form.captcha_secret_key} onChange={set("captcha_secret_key")} />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton onClick={() => saveSection("captcha", ["captcha_provider", "captcha_site_key", "captcha_secret_key"])} saving={saving === "captcha"} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Stripe ── */}
            <TabsContent value="stripe">
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-foreground">Stripe</CardTitle>
                      <CardDescription>Payment processing keys.</CardDescription>
                    </div>
                    {form.stripe_mode === "test" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-semibold text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 whitespace-nowrap">
                        ● TEST MODE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/15 px-3 py-1 text-xs font-semibold text-green-600 dark:text-green-400 border border-green-500/30 whitespace-nowrap">
                        ● LIVE MODE
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">

                  {/* ── Webhook Callback URL ── */}
                  {(() => {
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
                    const webhookUrl = supabaseUrl
                      ? `${supabaseUrl.replace(/\/$/, "")}${STRIPE_WEBHOOK_PATH}`
                      : null;

                    if (!webhookUrl) {
                      return (
                        <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                          <span>Set <code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code> to see the webhook callback URL.</span>
                        </div>
                      );
                    }

                    return (
                      <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="text-sm font-medium text-foreground">Webhook Callback URL</h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Register this URL in your{" "}
                          <a
                            href="https://dashboard.stripe.com/webhooks"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                          >
                            Stripe Dashboard
                          </a>{" "}
                          under Developers → Webhooks. Create a separate webhook entry for Test mode and Live mode — both point to the same URL.
                        </p>
                        <div className="space-y-3">
                          <WebhookUrlRow
                            url={webhookUrl}
                            label="Endpoint URL"
                            badge={
                              <span className="inline-flex items-center rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
                                Test
                              </span>
                            }
                          />
                          <WebhookUrlRow
                            url={webhookUrl}
                            label="Endpoint URL"
                            badge={
                              <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                                Live
                              </span>
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          After creating each webhook in Stripe, copy its generated signing secret (<code className="bg-muted px-1 rounded">whsec_…</code>) into the Webhook Secret field below.
                        </p>
                      </div>
                    );
                  })()}

                  {/* ── Mode toggle ── */}
                  <div className="space-y-2">
                    <Label>Active Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={form.stripe_mode === "test" ? "default" : "outline"}
                        size="sm"
                        onClick={() => set("stripe_mode")("test")}
                      >
                        Test
                      </Button>
                      <Button
                        type="button"
                        variant={form.stripe_mode === "live" ? "default" : "outline"}
                        size="sm"
                        onClick={() => set("stripe_mode")("live")}
                      >
                        Live
                      </Button>
                    </div>
                    {form.stripe_mode === "test" && (
                      <p className="text-xs text-yellow-600 dark:text-yellow-400">
                        Test mode is active — Stripe will use test keys and no real charges will be made.
                      </p>
                    )}
                  </div>

                  {/* ── Test Keys ── */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <h3 className="text-sm font-semibold text-foreground">Test Keys</h3>
                      <span className="text-xs text-muted-foreground">pk_test_ / sk_test_</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-test-pub">Publishable Key</Label>
                        <ConfiguredBadge status={status.stripe_test_publishable_key} />
                      </div>
                      <Input
                        id="stripe-test-pub"
                        value={form.stripe_test_publishable_key}
                        placeholder="pk_test_…"
                        onChange={(e) => set("stripe_test_publishable_key")(e.target.value)}
                        className={form.stripe_test_publishable_key && !form.stripe_test_publishable_key.startsWith("pk_test_") ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {form.stripe_test_publishable_key && !form.stripe_test_publishable_key.startsWith("pk_test_") && (
                        <p className="text-xs text-destructive">Test publishable key must start with <code className="bg-muted px-1 rounded">pk_test_</code></p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-test-sec">Secret Key</Label>
                        <ConfiguredBadge status={status.stripe_test_secret_key} />
                      </div>
                      <SecretInput id="stripe-test-sec" value={form.stripe_test_secret_key} placeholder="sk_test_…" onChange={set("stripe_test_secret_key")} className={form.stripe_test_secret_key && !form.stripe_test_secret_key.startsWith("sk_test_") ? "border-destructive focus-visible:ring-destructive" : ""} />
                      {form.stripe_test_secret_key && !form.stripe_test_secret_key.startsWith("sk_test_") && (
                        <p className="text-xs text-destructive">Test secret key must start with <code className="bg-muted px-1 rounded">sk_test_</code></p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-test-wh">Webhook Secret</Label>
                        <ConfiguredBadge status={status.stripe_test_webhook_secret} />
                      </div>
                      <SecretInput id="stripe-test-wh" value={form.stripe_test_webhook_secret} placeholder="whsec_…" onChange={set("stripe_test_webhook_secret")} />
                    </div>
                  </div>

                  {/* ── Live Keys ── */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      <h3 className="text-sm font-semibold text-foreground">Live Keys</h3>
                      <span className="text-xs text-muted-foreground">pk_live_ / sk_live_</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-pub">Publishable Key</Label>
                        <ConfiguredBadge status={status.stripe_publishable_key} />
                      </div>
                      <Input
                        id="stripe-pub"
                        value={form.stripe_publishable_key}
                        placeholder="pk_live_…"
                        onChange={(e) => set("stripe_publishable_key")(e.target.value)}
                        className={form.stripe_publishable_key && !form.stripe_publishable_key.startsWith("pk_live_") ? "border-destructive focus-visible:ring-destructive" : ""}
                      />
                      {form.stripe_publishable_key && !form.stripe_publishable_key.startsWith("pk_live_") && (
                        <p className="text-xs text-destructive">Live publishable key must start with <code className="bg-muted px-1 rounded">pk_live_</code></p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-sec">Secret Key</Label>
                        <ConfiguredBadge status={status.stripe_secret_key} />
                      </div>
                      <SecretInput id="stripe-sec" value={form.stripe_secret_key} placeholder="sk_live_…" onChange={set("stripe_secret_key")} className={form.stripe_secret_key && !form.stripe_secret_key.startsWith("sk_live_") ? "border-destructive focus-visible:ring-destructive" : ""} />
                      {form.stripe_secret_key && !form.stripe_secret_key.startsWith("sk_live_") && (
                        <p className="text-xs text-destructive">Live secret key must start with <code className="bg-muted px-1 rounded">sk_live_</code></p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="stripe-wh">Webhook Secret</Label>
                        <ConfiguredBadge status={status.stripe_webhook_secret} />
                      </div>
                      <SecretInput id="stripe-wh" value={form.stripe_webhook_secret} placeholder="whsec_…" onChange={set("stripe_webhook_secret")} />
                    </div>
                  </div>

                  <div className="rounded-md bg-muted/40 border border-border p-3 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>
                        Keys are encrypted at rest. Checkout and webhooks use Supabase Edge Function secrets in production — configure{" "}
                        <code className="bg-muted px-1 rounded">STRIPE_SECRET_KEY</code> and{" "}
                        <code className="bg-muted px-1 rounded">STRIPE_WEBHOOK_SECRET</code> there, and point Stripe to your{" "}
                        <code className="bg-muted px-1 rounded">stripe-webhook</code> URL.
                      </span>

                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() =>
                        saveSection("stripe", [
                          "stripe_mode",
                          "stripe_test_publishable_key",
                          "stripe_test_secret_key",
                          "stripe_test_webhook_secret",
                          "stripe_publishable_key",
                          "stripe_secret_key",
                          "stripe_webhook_secret",
                        ])
                      }
                      saving={saving === "stripe"}
                      disabled={
                        (!!form.stripe_test_publishable_key && !form.stripe_test_publishable_key.startsWith("pk_test_")) ||
                        (!!form.stripe_test_secret_key && !form.stripe_test_secret_key.startsWith("sk_test_")) ||
                        (!!form.stripe_publishable_key && !form.stripe_publishable_key.startsWith("pk_live_")) ||
                        (!!form.stripe_secret_key && !form.stripe_secret_key.startsWith("sk_live_"))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Analytics &amp; public site</CardTitle>
                  <CardDescription>
                    IDs for third-party analytics (not secret, but stored encrypted like other keys). To load them in the storefront, mirror into Vite env vars (<code className="text-xs bg-muted px-1 rounded">VITE_GA_MEASUREMENT_ID</code>,{" "}
                    <code className="text-xs bg-muted px-1 rounded">VITE_PLAUSIBLE_DOMAIN</code>) or wire a small loader later.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ga-id">Google Analytics measurement ID</Label>
                      <ConfiguredBadge status={status.google_analytics_measurement_id} />
                    </div>
                    <Input
                      id="ga-id"
                      value={form.google_analytics_measurement_id}
                      placeholder="G-XXXXXXXXXX"
                      onChange={(e) => set("google_analytics_measurement_id")(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="plausible-domain">Plausible domain</Label>
                      <ConfiguredBadge status={status.plausible_domain} />
                    </div>
                    <Input
                      id="plausible-domain"
                      value={form.plausible_domain}
                      placeholder="dataeel.com"
                      onChange={(e) => set("plausible_domain")(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="site-url">Public site URL</Label>
                      <ConfiguredBadge status={status.site_public_url} />
                    </div>
                    <Input
                      id="site-url"
                      value={form.site_public_url}
                      placeholder="https://www.dataeel.com"
                      onChange={(e) => set("site_public_url")(e.target.value)}
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() =>
                        saveSection("analytics", [
                          "google_analytics_measurement_id",
                          "plausible_domain",
                          "site_public_url",
                        ])
                      }
                      saving={saving === "analytics"}
                    />
                  </div>
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

export default AdminSettings;
