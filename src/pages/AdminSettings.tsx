import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, Eye, EyeOff, Save, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

// Keys that exist in the DB + their presence status
interface SettingStatus {
  configured: boolean;
  preview: string | null; // e.g. "••••••••Vi9V"
}

interface SettingsStatus {
  [key: string]: SettingStatus;
}

// The form state — empty string means "no change", non-empty means "update to this"
interface SettingsForm {
  openrouter_api_key: string;
  openrouter_model: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  captcha_provider: string;
  captcha_site_key: string;
  captcha_secret_key: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
}

const EMPTY_FORM: SettingsForm = {
  openrouter_api_key: "",
  openrouter_model: "",
  smtp_host: "",
  smtp_port: "",
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  captcha_provider: "",
  captcha_site_key: "",
  captcha_secret_key: "",
  stripe_publishable_key: "",
  stripe_secret_key: "",
  stripe_webhook_secret: "",
};

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

// ── Main component ────────────────────────────────────────────────────────────

const AdminSettings = () => {
  const [status, setStatus] = useState<SettingsStatus>({});
  const [form, setForm] = useState<SettingsForm>(EMPTY_FORM);
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
      keys.forEach((k) => { cleared[k] = ""; });
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
        <div className="container mx-auto px-4 max-w-3xl">
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
              Values are encrypted with AES-256-GCM at rest. Leave a field blank to keep the existing value.
            </p>
          </div>

          <Tabs defaultValue="openrouter">
            <TabsList className="mb-4">
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="captcha">CAPTCHA</TabsTrigger>
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
            </TabsList>

            {/* ── OpenRouter ── */}
            <TabsContent value="openrouter">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">OpenRouter</CardTitle>
                  <CardDescription>AI model access via OpenRouter API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="or-key">API Key</Label>
                      <ConfiguredBadge status={status.openrouter_api_key} />
                    </div>
                    <SecretInput id="or-key" value={form.openrouter_api_key} placeholder="sk-or-v1-…" onChange={set("openrouter_api_key")} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="or-model">Default Model</Label>
                      <ConfiguredBadge status={status.openrouter_model} />
                    </div>
                    <Input id="or-model" value={form.openrouter_model} placeholder="e.g. openai/gpt-4o" onChange={(e) => set("openrouter_model")(e.target.value)} />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton onClick={() => saveSection("openrouter", ["openrouter_api_key", "openrouter_model"])} saving={saving === "openrouter"} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── SMTP ── */}
            <TabsContent value="smtp">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">SMTP</CardTitle>
                  <CardDescription>Transactional email configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="smtp-host">Host</Label><ConfiguredBadge status={status.smtp_host} /></div>
                      <Input id="smtp-host" value={form.smtp_host} placeholder="smtp.example.com" onChange={(e) => set("smtp_host")(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between"><Label htmlFor="smtp-port">Port</Label><ConfiguredBadge status={status.smtp_port} /></div>
                      <Input id="smtp-port" type="number" value={form.smtp_port} placeholder="587" onChange={(e) => set("smtp_port")(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-user">Username</Label><ConfiguredBadge status={status.smtp_user} /></div>
                    <Input id="smtp-user" value={form.smtp_user} placeholder="user@example.com" onChange={(e) => set("smtp_user")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-pass">Password</Label><ConfiguredBadge status={status.smtp_password} /></div>
                    <SecretInput id="smtp-pass" value={form.smtp_password} onChange={set("smtp_password")} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="smtp-from">From Address</Label><ConfiguredBadge status={status.smtp_from} /></div>
                    <Input id="smtp-from" value={form.smtp_from} placeholder="noreply@yourdomain.com" onChange={(e) => set("smtp_from")(e.target.value)} />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton onClick={() => saveSection("smtp", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"])} saving={saving === "smtp"} />
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
                  <CardDescription>Payment processing keys.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="stripe-pub">Publishable Key</Label><ConfiguredBadge status={status.stripe_publishable_key} /></div>
                    <Input id="stripe-pub" value={form.stripe_publishable_key} placeholder="pk_live_…" onChange={(e) => set("stripe_publishable_key")(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="stripe-sec">Secret Key</Label><ConfiguredBadge status={status.stripe_secret_key} /></div>
                    <SecretInput id="stripe-sec" value={form.stripe_secret_key} placeholder="sk_live_…" onChange={set("stripe_secret_key")} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between"><Label htmlFor="stripe-wh">Webhook Secret</Label><ConfiguredBadge status={status.stripe_webhook_secret} /></div>
                    <SecretInput id="stripe-wh" value={form.stripe_webhook_secret} placeholder="whsec_…" onChange={set("stripe_webhook_secret")} />
                  </div>
                  <div className="rounded-md bg-muted/40 border border-border p-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    Keys are encrypted with AES-256-GCM. The server never returns decrypted values — only a masked preview of the last 4 characters.
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton onClick={() => saveSection("stripe", ["stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret"])} saving={saving === "stripe"} />
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
