# Rock Solid Leveling

Marketing website for `rocksolidleveling.com`.

This build reworks the old `rbconcretelevel.com` content into a new brand-forward single-page site for Rock Solid Leveling, formerly R&B Concrete Leveling and Repair.

## Stack

- Vite
- React
- TypeScript
- Static deployment target: Cloudflare Pages

## Highlights

- New hero layout with a custom before/after comparison slider
- Scroll-reactive level graphic inspired by the new logo
- Content carried over from the old site and reorganized into a stronger marketing flow
- Quote request form that can post directly to an `n8n` webhook or fall back to email/share
- Cloudflare Pages deployment (GitHub as source repo)

## Local development

```bash
npm install
npm run dev
```

To enable direct form submissions, copy `.env.example` to `.env` and set:

```bash
VITE_N8N_WEBHOOK_URL=https://your-n8n-domain/webhook/your-webhook-id
VITE_N8N_FORM_ID=rock-solid-website
```

If `VITE_N8N_WEBHOOK_URL` is omitted, the quote form falls back to the existing share sheet and email draft flow.

For Cloudflare Pages deploys, set `VITE_N8N_WEBHOOK_URL` as a Cloudflare Pages environment variable. The production build injects that value at build time.
Use `/webhook-test/...` only while manually listening in n8n test mode. For the live site, use the active `/webhook/...` URL.

### Quote form submission flow (sanity check)

The quote form is submitted client-side from `src/App.tsx`:

1. If `VITE_N8N_WEBHOOK_URL` is set, the browser sends a `POST` request directly to that webhook URL.
2. The request body is `multipart/form-data` and includes:
   - contact fields (`fullName`, `phone`, `email`, `address`)
   - request details (`squareFeet`, `details`)
   - metadata (`formID`, `submissionID`, `rawRequest`, etc.)
   - uploaded photos under repeated `images` form-data keys
3. If webhook submission fails (or if `VITE_N8N_WEBHOOK_URL` is not configured), the form falls back to:
   - native device share sheet (when available), or
   - opening a `mailto:` draft to `info@rocksolidleveling.com` with the request summary.

Important: because this is a static frontend, the webhook URL is exposed to the browser at runtime. Protect the receiving workflow with validation/rate limiting.

## Production build

```bash
npm run build
```

## Cloudflare Pages deployment checklist

You already created the Cloudflare application (`rock-solid-leveling`), so these are the next tasks:

1. Connect this GitHub repository to the Cloudflare Pages project.
2. Configure build settings:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
3. Add environment variables in Cloudflare Pages (`Production` and optionally `Preview`):
   - `VITE_N8N_WEBHOOK_URL`
   - `VITE_N8N_FORM_ID` (optional, defaults to `rock-solid-website`)
4. Remove the GitHub Pages custom-domain artifact from this repo:
   - Delete `public/CNAME` (not needed for Cloudflare Pages).
5. In Cloudflare Pages, add custom domains:
   - `rocksolidleveling.com`
   - `www.rocksolidleveling.com`
6. Update DNS in Cloudflare:
   - Set `www` as a CNAME to your Cloudflare Pages target (`<project>.pages.dev`) and keep it proxied.
   - Point apex (`@`) using Cloudflare's recommended flattened CNAME / automatic Pages DNS target.
7. Turn off GitHub Pages for this repo (`Settings -> Pages`) so there is no parallel hosting target.
8. Validate after cutover:
   - `https://rocksolidleveling.com`
   - `https://www.rocksolidleveling.com`
   - form submission path with production webhook
   - `robots.txt` and `sitemap.xml` URLs

### If your Cloudflare screen shows Worker deploy commands

If you see `Deploy command: npx wrangler deploy`, you're in a **Workers build** flow, not the simpler Pages static flow used by this repo.

If you do **not** see an "Output directory" field, that's expected in this Workers UI.
In that case, the static output folder is provided via Wrangler deploy arguments instead of a separate form field.

For this Vite marketing site, use these project settings:

- Build command: `npm run build`
- Output directory: `dist` (Pages UI) **or** `--assets=dist` in deploy command (Workers UI)
- Root directory: `/`
- Production branch: `main`
- Environment variables:
  - `VITE_N8N_WEBHOOK_URL`
  - `VITE_N8N_FORM_ID` (optional)

Workers UI deploy command example for this repo:

- `npx wrangler deploy --assets=dist`

Recommended cleanup in that screen:

1. Reconnect GitHub (your screenshot shows it's disconnected).
2. Keep preview builds for non-production branches enabled.
3. Restrict build watch paths if desired (for example: `src/**`, `public/**`, `package.json`, `package-lock.json`, `vite.config.ts`).
4. Clear build cache once after changing build/runtime settings.

## Legacy GitHub Pages note

If you still have a `.github/workflows/deploy.yml` workflow for Pages, disable or remove it once Cloudflare is serving production traffic.
