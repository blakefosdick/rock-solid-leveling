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
VITE_N8N_FORM_ID=rock-solid-website
```

The quote form always submits to the in-project endpoint `/rock-solid-website-quote`.


### Quote form submission flow (sanity check)

The quote form is submitted client-side from `src/App.tsx`:

1. The browser sends a `POST` request to `/rock-solid-website-quote` on the same site origin.
2. The request body is `multipart/form-data` and includes:
   - contact fields (`fullName`, `phone`, `email`, `address`)
   - request details (`squareFeet`, `details`)
   - metadata (`formID`, `submissionID`, `rawRequest`, etc.)
   - uploaded photos under repeated `images` form-data keys
3. If submission fails, the form stays on-page and shows an error message so users can retry or call directly.

Important: because this is a static frontend, the webhook URL is exposed to the browser at runtime. Protect the receiving workflow with validation/rate limiting.


## Cloudflare Worker/Pages Function replacement for n8n

This repo now includes a Cloudflare Pages Function endpoint at:

- `POST /rock-solid-website-quote`

It replicates the n8n flow by:

1. Parsing the website `multipart/form-data` payload.
2. Uploading any `images` files to an R2 bucket with dated object keys.
3. Building public image URLs using `IMAGE_PUBLIC_BASE_URL`.
4. Upserting the contact to HighLevel (`/contacts/upsert`) with your tags + custom fields.

Required Cloudflare bindings/secrets for the function:

- `QUOTE_IMAGES_BUCKET` (R2 bucket binding, expected bucket: `quote-images`)
- `HIGHLEVEL_API_TOKEN` (secret)
- `HIGHLEVEL_LOCATION_ID`
- `HIGHLEVEL_SLABS_FIELD_ID`
- `HIGHLEVEL_IMAGES_FIELD_ID`
- `HIGHLEVEL_NOTES_FIELD_ID`
- `IMAGE_PUBLIC_BASE_URL` (example: `https://images.rocksolidleveling.com`)

To route the website form to this function, set:


### Important deployment note (fixes 404 on `/rock-solid-website-quote`)

If your deploy path uses Wrangler with `wrangler.jsonc`, this repo now uses a Worker entrypoint (`_worker.js`) that serves static assets and handles `POST /rock-solid-website-quote` directly.

That means the quote endpoint works even when Cloudflare Pages Functions are not active in your environment.

Tip: After changing Cloudflare secrets/bindings, deploy again and check `/rock-solid-website-quote-config` to verify runtime injection before testing the form.

If you are deploying from Codex Cloud PR builds, create a new commit/PR update to trigger a fresh deploy whenever function or worker code changes.

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
   - If Cloudflare is using `npx wrangler versions upload` as the deploy command, keep `wrangler.jsonc` in the repo root so Wrangler knows to upload `dist` as static assets.
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
