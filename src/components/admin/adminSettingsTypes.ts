export interface SettingStatus {
  configured: boolean;
  preview: string | null;
}

export type SettingsStatus = Record<string, SettingStatus>;

export interface SettingsForm {
  ai_chat_provider: string;
  openrouter_api_key: string;
  openrouter_model: string;
  anthropic_api_key: string;
  anthropic_model: string;
  openai_api_key: string;
  openai_model: string;
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
  google_analytics_measurement_id: string;
  plausible_domain: string;
  site_public_url: string;
}

export const EMPTY_SETTINGS_FORM: SettingsForm = {
  ai_chat_provider: "openrouter",
  openrouter_api_key: "",
  openrouter_model: "",
  anthropic_api_key: "",
  anthropic_model: "",
  openai_api_key: "",
  openai_model: "",
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
  google_analytics_measurement_id: "",
  plausible_domain: "",
  site_public_url: "",
};
