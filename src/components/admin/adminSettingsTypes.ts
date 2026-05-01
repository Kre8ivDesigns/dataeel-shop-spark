export interface SettingStatus {
  configured: boolean;
  preview: string | null;
  /** Non-secret values returned in full for admin display (e.g. daily cost cap). */
  readable?: string | null;
}

export type SettingsStatus = Record<string, SettingStatus>;

export interface SettingsForm {
  ai_chat_provider: string;
  /** USD per user per UTC day; empty = server default ($5). */
  ai_daily_cost_cap_usd: string;
  openrouter_api_key: string;
  openrouter_model: string;
  anthropic_api_key: string;
  anthropic_model: string;
  openai_api_key: string;
  openai_model: string;
  smtp_provider: string;
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_password: string;
  smtp_from: string;
  smtp_from_name: string;
  smtp_reply_to: string;
  captcha_provider: string;
  captcha_site_key: string;
  captcha_secret_key: string;
  stripe_mode: string;
  stripe_publishable_key: string;
  stripe_secret_key: string;
  stripe_webhook_secret: string;
  stripe_test_publishable_key: string;
  stripe_test_secret_key: string;
  stripe_test_webhook_secret: string;
  google_analytics_measurement_id: string;
  plausible_domain: string;
  site_public_url: string;
}

export const EMPTY_SETTINGS_FORM: SettingsForm = {
  ai_chat_provider: "openrouter",
  ai_daily_cost_cap_usd: "",
  openrouter_api_key: "",
  openrouter_model: "",
  anthropic_api_key: "",
  anthropic_model: "",
  openai_api_key: "",
  openai_model: "",
  smtp_provider: "generic",
  smtp_host: "",
  smtp_port: "",
  smtp_user: "",
  smtp_password: "",
  smtp_from: "",
  smtp_from_name: "",
  smtp_reply_to: "",
  captcha_provider: "",
  captcha_site_key: "",
  captcha_secret_key: "",
  stripe_mode: "test",
  stripe_publishable_key: "",
  stripe_secret_key: "",
  stripe_webhook_secret: "",
  stripe_test_publishable_key: "",
  stripe_test_secret_key: "",
  stripe_test_webhook_secret: "",
  google_analytics_measurement_id: "",
  plausible_domain: "",
  site_public_url: "",
};

export interface SmtpProviderPreset {
  id: string;
  label: string;
  host: string;
  port: string;
  note?: string;
}

export const SMTP_PROVIDER_PRESETS: SmtpProviderPreset[] = [
  {
    id: "google_workspace",
    label: "Google Workspace (Gmail)",
    host: "smtp.gmail.com",
    port: "587",
    note: "Use the Gmail/Workspace account where your support email lives. Username = full email; password = 16-char App Password (2FA required).",
  },
  {
    id: "sendgrid",
    label: "SendGrid",
    host: "smtp.sendgrid.net",
    port: "587",
    note: "Username is the literal string 'apikey'; password is your SendGrid API key.",
  },
  {
    id: "mailgun",
    label: "Mailgun",
    host: "smtp.mailgun.org",
    port: "587",
    note: "Use the SMTP credentials from the Mailgun domain settings page.",
  },
  {
    id: "ses",
    label: "Amazon SES",
    host: "email-smtp.us-east-1.amazonaws.com",
    port: "587",
    note: "Replace the region in the host if you're using a different SES region. Username/password come from IAM SMTP credentials.",
  },
  {
    id: "resend",
    label: "Resend",
    host: "smtp.resend.com",
    port: "587",
    note: "Username is 'resend'; password is your Resend API key.",
  },
  {
    id: "postmark",
    label: "Postmark",
    host: "smtp.postmarkapp.com",
    port: "587",
    note: "Both username and password are your Postmark Server Token.",
  },
  {
    id: "custom",
    label: "Custom / Generic SMTP",
    host: "",
    port: "587",
    note: "Enter your own host and port.",
  },
];
