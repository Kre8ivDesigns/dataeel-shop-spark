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
import { ArrowLeft, Loader2, Eye, EyeOff, Save, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

interface Settings {
  // OpenRouter
  openrouter_api_key: string;
  openrouter_model: string;
  // SMTP
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  // CAPTCHA
  captcha_provider: string;
  captcha_site_key: string;
  captcha_secret_key: string;
  // Stripe
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
}

const EMPTY: Settings = {
  openrouter_api_key: "",
  openrouter_model: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  captcha_provider: "hcaptcha",
  captcha_site_key: "",
  captcha_secret_key: "",
  stripe_publishable_key: "",
  stripe_secret_key: "",
  stripe_webhook_secret: "",
};

// ── Secret field component ────────────────────────────────────────────────────

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
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="pr-10 font-mono text-sm"
        autoComplete="off"
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

// ── Save button helper ────────────────────────────────────────────────────────

const SaveButton = ({ onClick, saving }: { onClick: () => void; saving: boolean }) => (
  <Button onClick={onClick} disabled={saving} className="bg-primary text-primary-foreground font-semibold">
    {saving ? (
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
    ) : (
      <Save className="h-4 w-4 mr-2" />
    )}
    {saving ? "Saving…" : "Save"}
  </Button>
);

// ── Main component ────────────────────────────────────────────────────────────

const AdminSettings = () => {
  const [settings, setSettings] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const set = (key: keyof Settings) => (value: string) =>
    setSettings((s) => ({ ...s, [key]: value }));

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-app-settings", {
        body: { action: "get" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSettings((s) => ({ ...s, ...(data.settings ?? {}) }));
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const saveSection = async (section: string, keys: (keyof Settings)[]) => {
    setSaving(section);
    try {
      const payload: Partial<Settings> = {};
      keys.forEach((k) => { payload[k] = settings[k]; });

      const { data, error } = await supabase.functions.invoke("manage-app-settings", {
        body: { action: "set", settings: payload },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Settings saved");
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
              All values are encrypted at rest using AES-256-GCM before being stored in the database.
            </p>
          </div>

          <Tabs defaultValue="openrouter">
            <TabsList className="mb-4">
              <TabsTrigger value="openrouter">OpenRouter</TabsTrigger>
              <TabsTrigger value="smtp">SMTP</TabsTrigger>
              <TabsTrigger value="captcha">CAPTCHA</TabsTrigger>
              <TabsTrigger value="stripe">Stripe</TabsTrigger>
            </TabsList>

            {/* ── OpenRouter ─────────────────────────────────────────────── */}
            <TabsContent value="openrouter">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">OpenRouter</CardTitle>
                  <CardDescription>AI model access via OpenRouter API.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="or-key">API Key</Label>
                    <SecretInput
                      id="or-key"
                      value={settings.openrouter_api_key}
                      placeholder="sk-or-v1-..."
                      onChange={set("openrouter_api_key")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="or-model">Default Model</Label>
                    <Input
                      id="or-model"
                      value={settings.openrouter_model}
                      placeholder="e.g. openai/gpt-4o"
                      onChange={(e) => set("openrouter_model")(e.target.value)}
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() => saveSection("openrouter", ["openrouter_api_key", "openrouter_model"])}
                      saving={saving === "openrouter"}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── SMTP ───────────────────────────────────────────────────── */}
            <TabsContent value="smtp">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">SMTP</CardTitle>
                  <CardDescription>Transactional email configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp-host">Host</Label>
                      <Input
                        id="smtp-host"
                        value={settings.smtp_host}
                        placeholder="smtp.example.com"
                        onChange={(e) => set("smtp_host")(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp-port">Port</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={settings.smtp_port}
                        placeholder="587"
                        onChange={(e) => set("smtp_port")(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-user">Username</Label>
                    <Input
                      id="smtp-user"
                      value={settings.smtp_user}
                      placeholder="user@example.com"
                      onChange={(e) => set("smtp_user")(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-pass">Password</Label>
                    <SecretInput
                      id="smtp-pass"
                      value={settings.smtp_password}
                      placeholder="SMTP password or app password"
                      onChange={set("smtp_password")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="smtp-from">From Address</Label>
                    <Input
                      id="smtp-from"
                      value={settings.smtp_from}
                      placeholder="noreply@yourdomain.com"
                      onChange={(e) => set("smtp_from")(e.target.value)}
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() => saveSection("smtp", ["smtp_host", "smtp_port", "smtp_user", "smtp_password", "smtp_from"])}
                      saving={saving === "smtp"}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── CAPTCHA ─────────────────────────────────────────────────── */}
            <TabsContent value="captcha">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">CAPTCHA</CardTitle>
                  <CardDescription>Bot protection on public forms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="captcha-provider">Provider</Label>
                    <Select
                      value={settings.captcha_provider}
                      onValueChange={set("captcha_provider")}
                    >
                      <SelectTrigger id="captcha-provider">
                        <SelectValue placeholder="Select provider" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hcaptcha">hCaptcha</SelectItem>
                        <SelectItem value="recaptcha">reCAPTCHA v2</SelectItem>
                        <SelectItem value="turnstile">Cloudflare Turnstile</SelectItem>
                        <SelectItem value="none">None / Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="captcha-site">Site Key</Label>
                    <Input
                      id="captcha-site"
                      value={settings.captcha_site_key}
                      placeholder="Public site key"
                      onChange={(e) => set("captcha_site_key")(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="captcha-secret">Secret Key</Label>
                    <SecretInput
                      id="captcha-secret"
                      value={settings.captcha_secret_key}
                      placeholder="Secret key (server-side)"
                      onChange={set("captcha_secret_key")}
                    />
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() => saveSection("captcha", ["captcha_provider", "captcha_site_key", "captcha_secret_key"])}
                      saving={saving === "captcha"}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Stripe ──────────────────────────────────────────────────── */}
            <TabsContent value="stripe">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Stripe</CardTitle>
                  <CardDescription>Payment processing keys.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-pub">Publishable Key</Label>
                    <Input
                      id="stripe-pub"
                      value={settings.stripe_publishable_key}
                      placeholder="pk_live_..."
                      onChange={(e) => set("stripe_publishable_key")(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-sec">Secret Key</Label>
                    <SecretInput
                      id="stripe-sec"
                      value={settings.stripe_secret_key}
                      placeholder="sk_live_..."
                      onChange={set("stripe_secret_key")}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="stripe-wh">Webhook Secret</Label>
                    <SecretInput
                      id="stripe-wh"
                      value={settings.stripe_webhook_secret}
                      placeholder="whsec_..."
                      onChange={set("stripe_webhook_secret")}
                    />
                  </div>
                  <div className="rounded-md bg-muted/40 border border-border p-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    Keys are encrypted with AES-256-GCM before storage. They are never returned in logs or error messages.
                  </div>
                  <div className="pt-2 flex justify-end">
                    <SaveButton
                      onClick={() => saveSection("stripe", ["stripe_publishable_key", "stripe_secret_key", "stripe_webhook_secret"])}
                      saving={saving === "stripe"}
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
