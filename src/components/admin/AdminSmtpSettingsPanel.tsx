import { useState, type ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, Send, Mail } from "lucide-react";
import { toast } from "sonner";
import type { SettingStatus, SettingsForm, SettingsStatus } from "./adminSettingsTypes";

// ── Provider presets ─────────────────────────────────────────────────────────

type ProviderPreset = {
  label: string;
  host: string;
  port: string;
  note?: string;
};

const SMTP_PRESETS: Record<string, ProviderPreset> = {
  google_workspace: {
    label: "Google Workspace",
    host: "smtp.gmail.com",
    port: "587",
    note: "Use an App Password (not your Google account password) if 2FA is enabled.",
  },
  sendgrid: {
    label: "SendGrid",
    host: "smtp.sendgrid.net",
    port: "587",
    note: "Username is always 'apikey'; use your SendGrid API key as the password.",
  },
  mailgun: {
    label: "Mailgun",
    host: "smtp.mailgun.org",
    port: "587",
    note: "Use SMTP credentials from your Mailgun domain settings.",
  },
  ses: {
    label: "Amazon SES",
    host: "email-smtp.us-east-1.amazonaws.com",
    port: "587",
    note: "Use SMTP credentials from the SES console (not your AWS access keys). Change the region in the host if needed.",
  },
  resend: {
    label: "Resend",
    host: "smtp.resend.com",
    port: "465",
    note: "Username is always 'resend'; use your Resend API key as the password.",
  },
  generic: {
    label: "Generic SMTP",
    host: "",
    port: "587",
    note: "Enter your SMTP server details manually.",
  },
};

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  status: SettingsStatus;
  form: SettingsForm;
  set: (key: keyof SettingsForm) => (value: string) => void;
  SecretInput: ComponentType<{ id: string; value: string; placeholder?: string; onChange: (v: string) => void }>;
  ConfiguredBadge: ComponentType<{ status?: SettingStatus }>;
  saving: boolean;
  onSave: () => void;
};

// ── Component ────────────────────────────────────────────────────────────────

export function AdminSmtpSettingsPanel({
  status,
  form,
  set,
  SecretInput,
  ConfiguredBadge,
  saving,
  onSave,
}: Props) {
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);

  const activeProvider = form.smtp_provider || "generic";
  const preset = SMTP_PRESETS[activeProvider];

  const handleProviderChange = (provider: string) => {
    set("smtp_provider")(provider);
    const p = SMTP_PRESETS[provider];
    if (p) {
      // Only pre-fill host/port when switching to a non-generic preset
      // and the current host field is empty or matches another preset
      if (p.host) {
        set("smtp_host")(p.host);
        set("smtp_port")(p.port);
      } else if (provider === "generic") {
        // For generic, just clear preset host/port to let user fill in manually
        // but only if coming from a preset
        const currentPreset = Object.values(SMTP_PRESETS).find(
          (pr) => pr.host === form.smtp_host
        );
        if (currentPreset) {
          set("smtp_host")("");
          set("smtp_port")(p.port);
        }
      }
    }
  };

  const handleTestSend = async () => {
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      toast.error("Enter a valid email address to send the test to.");
      return;
    }
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-app-settings", {
        body: { action: "smtp_test", test_to: testEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Test email sent to ${testEmail}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Test send failed. Check your SMTP credentials and configuration.";
      toast.error(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider selector */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Mail className="h-5 w-5" />
            SMTP
          </CardTitle>
          <CardDescription>
            Transactional email for custom mailers and Edge Functions. Select a provider preset to
            auto-fill the host and port, then enter your credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Active provider */}
          <div className="space-y-1.5">
            <Label htmlFor="smtp-provider">Provider</Label>
            <Select value={activeProvider} onValueChange={handleProviderChange}>
              <SelectTrigger id="smtp-provider" className="bg-muted border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SMTP_PRESETS).map(([id, p]) => (
                  <SelectItem key={id} value={id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {preset?.note && (
              <p className="text-xs text-muted-foreground">{preset.note}</p>
            )}
          </div>

          {/* Host + Port */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="smtp-host">Host</Label>
                <ConfiguredBadge status={status.smtp_host} />
              </div>
              <Input
                id="smtp-host"
                value={form.smtp_host}
                placeholder="smtp.example.com"
                onChange={(e) => set("smtp_host")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="smtp-port">Port</Label>
                <ConfiguredBadge status={status.smtp_port} />
              </div>
              <Input
                id="smtp-port"
                type="number"
                value={form.smtp_port}
                placeholder="587"
                onChange={(e) => set("smtp_port")(e.target.value)}
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="smtp-user">Username</Label>
              <ConfiguredBadge status={status.smtp_user} />
            </div>
            <Input
              id="smtp-user"
              value={form.smtp_user}
              placeholder={
                activeProvider === "sendgrid"
                  ? "apikey"
                  : activeProvider === "resend"
                  ? "resend"
                  : "user@example.com"
              }
              onChange={(e) => set("smtp_user")(e.target.value)}
            />
          </div>

          {/* Password / App password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="smtp-pass">
                {activeProvider === "google_workspace" ? "App Password" : "Password"}
              </Label>
              <ConfiguredBadge status={status.smtp_password} />
            </div>
            <SecretInput
              id="smtp-pass"
              value={form.smtp_password}
              placeholder={
                activeProvider === "sendgrid" || activeProvider === "resend"
                  ? "API key…"
                  : activeProvider === "google_workspace"
                  ? "16-character app password…"
                  : "Enter new value to update…"
              }
              onChange={set("smtp_password")}
            />
          </div>

          {/* From name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="smtp-from-name">From Name</Label>
              <ConfiguredBadge status={status.smtp_from_name} />
            </div>
            <Input
              id="smtp-from-name"
              value={form.smtp_from_name}
              placeholder="DataEel"
              onChange={(e) => set("smtp_from_name")(e.target.value)}
            />
          </div>

          {/* From address */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="smtp-from">From Address</Label>
              <ConfiguredBadge status={status.smtp_from} />
            </div>
            <Input
              id="smtp-from"
              value={form.smtp_from}
              placeholder="noreply@yourdomain.com"
              onChange={(e) => set("smtp_from")(e.target.value)}
            />
          </div>

          {/* Reply-to */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="smtp-reply-to">Reply-To (optional)</Label>
              <ConfiguredBadge status={status.smtp_reply_to} />
            </div>
            <Input
              id="smtp-reply-to"
              value={form.smtp_reply_to}
              placeholder="support@yourdomain.com"
              onChange={(e) => set("smtp_reply_to")(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={onSave}
              disabled={saving}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test send */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Send className="h-5 w-5" />
            Test send
          </CardTitle>
          <CardDescription>
            Send a test email using the saved SMTP configuration. Save your settings first, then enter
            an address to test delivery.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleTestSend}
              disabled={testing || !testEmail}
              className="gap-2 shrink-0"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {testing ? "Sending…" : "Send test"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
