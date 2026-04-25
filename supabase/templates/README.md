# DATAEEL® Email Templates

Branded transactional email templates for Supabase Auth.

## Logo Asset

The HTML template references the logo at `{{ .SiteURL }}/dataeel-logo.png`.

`{{ .SiteURL }}` is the **Site URL** set in the Supabase Dashboard under
**Project Settings → Authentication → URL Configuration → Site URL**
(e.g. `https://www.dataeel.com`).

The `dataeel-logo.png` image must be publicly accessible at that URL.
In this project, `public/dataeel-logo.png` is served at the root path
(`/dataeel-logo.png`) in production, so no extra configuration is required.
If the logo moves, replace the `src` attribute in the template with a full
absolute URL (e.g. from a CDN).

---

## Files

| File | Purpose |
|---|---|
| `confirmation.html` | HTML email sent when a new user confirms their signup |
| `confirmation.txt` | Plain-text fallback for the same email |

## Template Variables

Supabase replaces the following Go-template placeholders at send time:

| Variable | Description |
|---|---|
| `{{ .ConfirmationURL }}` | Full one-click confirmation link |
| `{{ .Email }}` | Recipient's email address |
| `{{ .SiteURL }}` | Site URL configured in your Supabase project settings |

---

## Local Development

The `supabase/config.toml` file already wires `confirmation.html` for the
local Supabase stack (`supabase start`). No additional steps needed.

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
5. Paste the entire contents of `confirmation.html` into the **HTML Body** editor.
6. Click **Save**.

> **Tip — Sender address:** To send from `support@dataeel.com` (or any custom
> domain), configure a custom SMTP provider in the Supabase Dashboard under
> **Project Settings → Authentication → SMTP Settings** before applying the
> template. This controls the sender address for all Supabase Auth emails
> (signup, password reset, etc.).
> The in-app **Admin Settings → SMTP** panel stores SMTP credentials for
> Edge Functions (e.g. future transactional mailers) and is separate from
> Supabase Auth's own SMTP.

---

## Adding More Templates

Copy the pattern for `confirmation.html` and add a new section to
`supabase/config.toml`:

```toml
[auth.email.template.recovery]
subject = "Reset your DATAEEL® password"
content_path = "./supabase/templates/recovery.html"
```

Supported template types: `confirmation`, `recovery`, `invite`,
`magic_link`, `email_change`, `reauthentication`.
