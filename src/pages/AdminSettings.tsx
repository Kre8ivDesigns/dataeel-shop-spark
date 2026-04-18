import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Eye, EyeOff, Save, CheckCircle2, XCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdminAiSettingsPanel } from "@/components/admin/AdminAiSettingsPanel";
import {
  EMPTY_SETTINGS_FORM,
  SMTP_PROVIDER_PRESETS,
  type SettingStatus,
  type SettingsForm,
  type SettingsStatus,
} from "@/components/admin/adminSettingsTypes";

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
}: {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
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
        className="pr-10 font-mono text-sm"
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

const SaveButton = ({ onClick, saving }: { onClick: () => void; saving: boolean }) => (
  <Button onClick={onClick} disabled={saving} className="bg-primary text-primary-foreground font-semibold">
    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
    {saving ? "Saving…" : "Save"}
  </Button>
);

const StripeWebhookUrl = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const webhookUrl = supabaseUrl
    ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/stripe-webhook`
    : "";

  const copy = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success("Copied webhook URL");
    } catch {
      toast.error("Copy failed — select and copy manually");
    }
  };

  return (
    <div className="rounded-md bg-muted/40 border border-border p-3 space-y-2">
      <Label className="text-xs text-muted-foreground">Webhook callback URL (paste into Stripe Dashboard → Developers → Webhooks)</Label>
      {webhookUrl ? (
        <div className="flex gap-2">
          <Input readOnly value={webhookUrl} className="font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
          <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0">
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Set <code className="bg-muted px-1 rounded">VITE_SUPABASE_URL</code> to display the webhook URL.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Use the same URL for both test and live — Stripe determines which set of keys to sign based on the webhook's own mode. Configure two webhooks in Stripe (one in test, one in live) if you need separate signing secrets.
      </p>
    </div>
  );
};

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
    const payload: Partial<SettingsForm> = {};
    keys.forEach((k) => { if (form[k] !== "") payload[k] = form[k]; });

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
        if (key === "ai_chat_provider") {
          cleared[key] = form[key] || EMPTY_SETTINGS_FORM.ai_chat_provider;
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
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">SMTP</CardTitle>
                  <CardDescription>
                    Outgoing mail for signup, password reset, and transactional emails.
                    Pick a provider to auto-fill host/port. Supabase Auth emails still use the project&apos;s Auth SMTP unless you mirror these values in the Supabase dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-provider">Provider</Label><ConfiguredBadge status={status.smtp_provider} /></div>
                    <Select
                      value={form.smtp_provider || "google_workspace"}
                      onValueChange={(v) => {
                        const preset = SMTP_PROVIDER_PRESETS.find((p) => p.id === v);
                        setForm((f) => ({
                          ...f,
                          smtp_provider: v,
                          smtp_host: preset?.host ? preset.host : f.smtp_host,
                          smtp_port: preset?.port ? preset.port : f.smtp_port,
                        }));
                      }}
                    >
                      <SelectTrigger id="smtp-provider"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SMTP_PROVIDER_PRESETS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {(() => {
                      const preset = SMTP_PROVIDER_PRESETS.find((p) => p.id === (form.smtp_provider || "google_workspace"));
                      return preset?.note ? (
                        <p className="text-xs text-muted-foreground">{preset.note}</p>
                      ) : null;
                    })()}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="smtp-host">Host</Label><ConfiguredBadge status={status.smtp_host} /></div>
                      <Input id="smtp-host" value={form.smtp_host} placeholder="smtp.gmail.com" onChange={(e) => set("smtp_host")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="smtp-port">Port</Label><ConfiguredBadge status={status.smtp_port} /></div>
                      <Input id="smtp-port" type="number" value={form.smtp_port} placeholder="587" onChange={(e) => set("smtp_port")(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-user">Username</Label><ConfiguredBadge status={status.smtp_user} /></div>
                    <Input id="smtp-user" value={form.smtp_user} placeholder="support@yourdomain.com" onChange={(e) => set("smtp_user")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-pass">Password / App password</Label><ConfiguredBadge status={status.smtp_password} /></div>
                    <SecretInput id="smtp-pass" value={form.smtp_password} onChange={set("smtp_password")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="smtp-from">From address</Label><ConfiguredBadge status={status.smtp_from} /></div>
                      <Input id="smtp-from" value={form.smtp_from} placeholder="support@yourdomain.com" onChange={(e) => set("smtp_from")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="smtp-from-name">From name</Label><ConfiguredBadge status={status.smtp_from_name} /></div>
                      <Input id="smtp-from-name" value={form.smtp_from_name} placeholder="Dataeel Support" onChange={(e) => set("smtp_from_name")(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-reply-to">Reply-to address (optional)</Label><ConfiguredBadge status={status.smtp_reply_to} /></div>
                    <Input id="smtp-reply-to" value={form.smtp_reply_to} placeholder="support@yourdomain.com" onChange={(e) => set("smtp_reply_to")(e.target.value)} />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton onClick={() => saveSection("smtp", ["smtp_provider", "smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from", "smtp_from_name", "smtp_reply_to"])} saving={saving === "smtp"} />
                  </div>
                </CardContent>
              </Card>
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
                  <CardTitle className="text-foreground">Stripe</CardTitle>
                  <CardDescription>Keep both test and live keys here; the active mode picks which set is used.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-mode">Active mode</Label>
                    <Select value={form.stripe_mode || "test"} onValueChange={set("stripe_mode")}>
                      <SelectTrigger id="stripe-mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test mode</SelectItem>
                        <SelectItem value="live">Live mode</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Edge Functions read <code className="bg-muted px-1 rounded">stripe_mode</code> from app_settings and pick the matching key set. Test keys must start with <code className="bg-muted px-1 rounded">pk_test_</code> / <code className="bg-muted px-1 rounded">sk_test_</code>; live keys with <code className="bg-muted px-1 rounded">pk_live_</code> / <code className="bg-muted px-1 rounded">sk_live_</code>.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Live keys</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="stripe-pub">Publishable key</Label><ConfiguredBadge status={status.stripe_publishable_key} /></div>
                      <Input id="stripe-pub" value={form.stripe_publishable_key} placeholder="pk_live_…" onChange={(e) => set("stripe_publishable_key")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="stripe-sec">Secret key</Label><ConfiguredBadge status={status.stripe_secret_key} /></div>
                      <SecretInput id="stripe-sec" value={form.stripe_secret_key} placeholder="sk_live_…" onChange={set("stripe_secret_key")} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="stripe-wh">Webhook signing secret</Label><ConfiguredBadge status={status.stripe_webhook_secret} /></div>
                      <SecretInput id="stripe-wh" value={form.stripe_webhook_secret} placeholder="whsec_…" onChange={set("stripe_webhook_secret")} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">Test keys</h3>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="stripe-test-pub">Publishable key</Label><ConfiguredBadge status={status.stripe_test_publishable_key} /></div>
                      <Input id="stripe-test-pub" value={form.stripe_test_publishable_key} placeholder="pk_test_…" onChange={(e) => set("stripe_test_publishable_key")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="stripe-test-sec">Secret key</Label><ConfiguredBadge status={status.stripe_test_secret_key} /></div>
                      <SecretInput id="stripe-test-sec" value={form.stripe_test_secret_key} placeholder="sk_test_…" onChange={set("stripe_test_secret_key")} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="stripe-test-wh">Webhook signing secret</Label><ConfiguredBadge status={status.stripe_test_webhook_secret} /></div>
                      <SecretInput id="stripe-test-wh" value={form.stripe_test_webhook_secret} placeholder="whsec_…" onChange={set("stripe_test_webhook_secret")} />
                    </div>
                  </div>

                  <StripeWebhookUrl />

                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() =>
                        saveSection("stripe", [
                          "stripe_mode",
                          "stripe_publishable_key",
                          "stripe_secret_key",
                          "stripe_webhook_secret",
                          "stripe_test_publishable_key",
                          "stripe_test_secret_key",
                          "stripe_test_webhook_secret",
                        ])
                      }
                      saving={saving === "stripe"}
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
