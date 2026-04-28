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

## Legacy GitHub Pages note

If you still have a `.github/workflows/deploy.yml` workflow for Pages, disable or remove it once Cloudflare is serving production traffic.
