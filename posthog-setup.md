# PostHog Setup

## Current status

PostHog is installed on the Rock Solid Leveling public site, not the admin app. The synced base includes `posthog-js` in `package.json`, initializes it from `src/main.tsx`, and keeps the wrapper in `src/analytics.ts`.

Local verification on 2026-07-16:

- `npm run build` passes.
- The rebuilt `dist/assets/main-*.js` bundle includes the PostHog host, public key, and custom event names.
- A direct PostHog ingest smoke test returned HTTP 200 with `{"status":"Ok"}` for event `codex_posthog_smoke_test`.

## Required environment variables

Vite only embeds `VITE_*` values at build time. If the production build does not receive these values, `src/analytics.ts` exits early and no pageviews or custom events are sent.

Set these for the production build environment:

```bash
VITE_POSTHOG_KEY=phc_YOUR_PUBLIC_SITE_PROJECT_KEY
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

For Cloudflare Pages, add them under the Pages project environment variables for Production and Preview as needed. For GitHub Actions builds, these are now passed from GitHub repository variables as `vars.VITE_POSTHOG_KEY` and `vars.VITE_POSTHOG_HOST`.

## Instrumented events

| Event name | Trigger | File |
| --- | --- | --- |
| `$pageview` | Initial page load from PostHog SDK config | `src/analytics.ts` |
| `quote_form_started` | First focus inside the quote form | `src/App.tsx` |
| `quote_form_submitted` | Quote form submission succeeds | `src/App.tsx` |
| `quote_form_submission_failed` | Quote form submission fails | `src/App.tsx` |
| `$exception` | Quote form submission error path via `captureException` | `src/App.tsx` |
| `cta_clicked` | Header or hero CTA click | `src/App.tsx` |
| `faq_expanded` | FAQ item opened | `src/App.tsx` |
| `google_review_link_clicked` | Google reviews link clicked | `src/App.tsx` |
| `phone_number_clicked` | Footer phone link clicked | `src/App.tsx` |
| `email_clicked` | Footer email link clicked | `src/App.tsx` |

## Likely reason live events were blank

The local `.env` contains PostHog values, so local builds include analytics. The repo deploy workflow previously did not pass `VITE_POSTHOG_KEY` or `VITE_POSTHOG_HOST` into `npm run build`, and the README did not list those variables in the Cloudflare Pages checklist. A production build made without `VITE_POSTHOG_KEY` will ship the analytics wrapper but disable all captures.

After setting the variables in the actual production build host, redeploy and check PostHog Live Events while visiting the deployed site in a normal browser session. Search for `site = rock-solid-leveling` or trigger `quote_form_started` by focusing any quote form field.
