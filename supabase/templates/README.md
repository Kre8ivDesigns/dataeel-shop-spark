# DATAEEL® Email Templates

Branded transactional email templates for Supabase Auth.

## Logo Asset

The HTML template references the logo at `{{ .SiteURL }}/dataeel-logo.png`.

`{{ .SiteURL }}` is the **Site URL** set in the Supabase Dashboard under
**Project Settings → Authentication → URL Configuration → Site URL**
(e.g. `https://www.thedataeel.com`).

The `dataeel-logo.png` image must be publicly accessible at that URL.
In this project, `public/dataeel-logo.png` is served at the root path
(`/dataeel-logo.png`) in production, so no extra configuration is required.
If the logo moves, replace the `src` attribute in the template with a full
absolute URL (e.g. from a CDN).

---

## Files

| File | Purpose |
|---|---|
| **`confirm-signup.html`** | **Canonical** HTML for **Confirm signup** — this path is wired in `supabase/config.toml` for local `supabase start` (`[auth.email.template.confirmation]`). **Paste this file** into the Dashboard for production. |
| `confirmation.html` | Older alternate layout; do **not** use for Dashboard unless you intentionally prefer it over `confirm-signup.html` (then keep local `config.toml` in sync). |
| `confirmation.txt` | Reference plain-text body if your provider or workflow needs a non-HTML variant |

## Template Variables

Supabase replaces the following Go-template placeholders at send time:

| Variable | Description |
|---|---|
| `{{ .ConfirmationURL }}` | Full one-click confirmation link |
| `{{ .Email }}` | Recipient's email address |
| `{{ .SiteURL }}` | Site URL configured in your Supabase project settings |

---

## Local Development

`supabase/config.toml` wires **`confirm-signup.html`** for the confirmation template (`[auth.email.template.confirmation]`). Run `supabase start` — no extra steps for local email HTML.

---

## Production — Supabase Dashboard

Supabase cloud projects use the templates configured in the Dashboard.
Follow these steps to apply the custom template:

1. Open **[Supabase Dashboard](https://app.supabase.com)** and select your project.
2. Go to **Authentication → Email Templates**.
3. Select the **Confirm signup** template.
4. Set **Subject** to:
   ```
   Confirm your DATAEEL® account
   ```
5. Paste the entire contents of **`confirm-signup.html`** into the **HTML Body** editor (must match `config.toml` so local and hosted templates stay aligned).
6. Click **Save**.

> **Critical — Two SMTP surfaces:**  
> **Authentication → SMTP** in the Supabase Dashboard sends **signup, confirmation, reset password, and magic links**.  
> The in-app **Admin → Settings → SMTP** panel is **only** for Edge Functions (e.g. admin test emails via `manage-app-settings`). **Configuring Admin SMTP does not send Auth emails.**  
> To send Auth mail from your domain, set **Authentication → SMTP** (and verify DKIM/SPF at your provider).

---

## Adding More Templates

Copy the pattern for `confirm-signup.html` and add a new section to
`supabase/config.toml`:

```toml
[auth.email.template.recovery]
subject = "Reset your DATAEEL® password"
content_path = "./supabase/templates/recovery.html"
```

Supported template types: `confirmation`, `recovery`, `invite`,
`magic_link`, `email_change`, `reauthentication`.
